import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Store, AiPredictionLog
from app.schemas.schemas import AdvisorInput, AdvisorResponse, ExplainRequest, ExplainResponse
from app.api.deps import get_current_store, get_model_registry
from app.ml.registry import ModelRegistry

router = APIRouter(prefix="/ai", tags=["AI Advisor"])

@router.post("/recommend", response_model=AdvisorResponse)
def get_ai_recommendation(
    product: AdvisorInput,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    # 1. Expiry Risk (XGBoost / fallback)
    risk, risk_label, expiry_model = registry.predict_expiry_risk(
        days_left=product.days_left,
        stock=product.stock,
        demand_rate=product.demand_rate,
        price=product.price,
        cost=product.cost,
        price_changes=product.price_change_count
    )

    # 2. Demand Forecast (Ridge Regression / fallback)
    forecast, demand_model = registry.predict_demand(
        lag1=product.lag1,
        lag2=product.lag2,
        days_left=product.days_left,
        price=product.price,
        default_rate=product.demand_rate
    )

    # 3. Discount Optimization (DQN / rule-based ladder)
    discount, q_values, discount_model = registry.predict_discount(
        days_left=product.days_left,
        stock=product.stock,
        forecast=forecast,
        price_changes=product.price_change_count,
        category=product.category,
        shelf_life=product.shelf_life
    )

    suggested_price = round(product.price * (1.0 - discount / 100.0), 2)
    days_cover = round(product.stock / max(forecast, 1), 1)

    # Expected units sold with price elasticity
    elasticity = 1.0 + (discount / 35.0)
    expected_units = min(product.stock, int(round(forecast * elasticity)))
    expected_revenue = round(expected_units * suggested_price, 2)
    expected_profit = round(expected_revenue - (expected_units * product.cost), 2)

    response = AdvisorResponse(
        expiry_risk=risk,
        risk_label=risk_label,
        demand_forecast=forecast,
        days_cover=days_cover,
        recommended_discount=discount,
        suggested_price=suggested_price,
        expected_revenue=expected_revenue,
        expected_profit=expected_profit,
        q_values=q_values,
        models_used={
            "expiry": expiry_model,
            "demand": demand_model,
            "discount": discount_model
        }
    )

    # Log prediction to ai_predictions table
    try:
        log = AiPredictionLog(
            store_id=store.id,
            model_name="advisor_pipeline_v1",
            input_payload=json.dumps(product.dict()),
            output_payload=json.dumps(response.dict())
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"[WARN] Failed to log AI prediction: {e}")

    return response

@router.post("/explain", response_model=ExplainResponse)
def explain_risk(
    req: ExplainRequest,
    registry: ModelRegistry = Depends(get_model_registry)
):
    base_val, score, features = registry.explain_expiry_risk(
        days_left=req.days_left,
        stock=req.stock,
        demand_rate=req.demand_rate,
        price=req.price,
        cost=req.cost
    )

    return ExplainResponse(
        base_value=base_val,
        risk_score=score,
        features=features,
        disclaimer="Explanations describe model behavior and do not prove cause."
    )
