from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Store, User, FraudFlag, B2BTransaction, B2BCustomer, Product, AuditLog
from app.schemas.schemas import FraudFlagItem, FraudFlagUpdate
from app.api.deps import get_current_user, get_current_store, get_model_registry, require_roles
from app.ml.registry import ModelRegistry

router = APIRouter(prefix="/fraud", tags=["Fraud Watch"])

@router.get("/flags", response_model=List[FraudFlagItem])
def get_fraud_flags(
    status_filter: Optional[str] = None,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db)
):
    query = (
        db.query(FraudFlag, B2BTransaction, B2BCustomer, Product)
        .join(B2BTransaction, B2BTransaction.id == FraudFlag.transaction_id)
        .join(B2BCustomer, B2BCustomer.id == B2BTransaction.customer_id)
        .join(Product, Product.id == B2BTransaction.product_id)
        .filter(FraudFlag.store_id == store.id)
    )

    if status_filter and status_filter != "all":
        query = query.filter(FraudFlag.status == status_filter)

    results = query.order_by(FraudFlag.created_at.desc()).all()

    res = []
    for flag, txn, cust, prod in results:
        res.append(FraudFlagItem(
            id=flag.id,
            transaction_id=txn.id,
            customer_name=cust.name,
            product_name=prod.name,
            quantity=txn.quantity,
            amount=txn.amount,
            payment_mode=txn.payment_mode,
            hour=txn.hour,
            date=txn.date.isoformat(),
            anomaly_score=round(flag.anomaly_score, 3),
            risk_level=flag.risk_level,
            reason=flag.reason,
            status=flag.status,
            review_note=flag.review_note,
            reviewed_at=flag.reviewed_at,
            created_at=flag.created_at
        ))
    return res

@router.patch("/flags/{id}", response_model=FraudFlagItem)
def update_fraud_flag(
    id: int,
    data: FraudFlagUpdate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager"])),
    db: Session = Depends(get_db)
):
    flag = db.query(FraudFlag).filter(FraudFlag.id == id, FraudFlag.store_id == store.id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")

    flag.status = data.status
    if data.review_note is not None:
        flag.review_note = data.review_note
    flag.reviewed_by_id = current_user.id
    flag.reviewed_at = datetime.utcnow()

    db.add(flag)

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="REVIEW_FRAUD_FLAG",
        target_type="FRAUD_FLAG",
        target_id=flag.id,
        details=f"Flag {flag.id} marked as {data.status} with note: '{data.review_note}'"
    )
    db.add(log)
    db.commit()
    db.refresh(flag)

    txn = db.query(B2BTransaction).filter(B2BTransaction.id == flag.transaction_id).first()
    cust = db.query(B2BCustomer).filter(B2BCustomer.id == txn.customer_id).first()
    prod = db.query(Product).filter(Product.id == txn.product_id).first()

    return FraudFlagItem(
        id=flag.id,
        transaction_id=txn.id,
        customer_name=cust.name if cust else "",
        product_name=prod.name if prod else "",
        quantity=txn.quantity,
        amount=txn.amount,
        payment_mode=txn.payment_mode,
        hour=txn.hour,
        date=txn.date.isoformat(),
        anomaly_score=round(flag.anomaly_score, 3),
        risk_level=flag.risk_level,
        reason=flag.reason,
        status=flag.status,
        review_note=flag.review_note,
        reviewed_at=flag.reviewed_at,
        created_at=flag.created_at
    )

@router.get("/metrics")
def get_fraud_metrics(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db)
):
    flags = db.query(FraudFlag).filter(FraudFlag.store_id == store.id).all()

    score_dist = {"0.0-0.4": 0, "0.4-0.6": 0, "0.6-0.8": 0, "0.8-1.0": 0}
    for f in flags:
        s = f.anomaly_score
        if s < 0.4: score_dist["0.0-0.4"] += 1
        elif s < 0.6: score_dist["0.4-0.6"] += 1
        elif s < 0.8: score_dist["0.6-0.8"] += 1
        else: score_dist["0.8-1.0"] += 1

    feature_importance = [
        {"feature": "Order Quantity", "weight": 0.32},
        {"feature": "Transaction Amount (₹)", "weight": 0.28},
        {"feature": "Hour of Day (off-peak)", "weight": 0.18},
        {"feature": "Customer 7-day Frequency", "weight": 0.14},
        {"feature": "Payment Mode", "weight": 0.08},
    ]

    return {
        "score_distribution": score_dist,
        "feature_importance": feature_importance,
        "threshold": store.fraud_threshold,
        "total_flags": len(flags),
        "pending_flags": sum(1 for f in flags if f.status == "pending"),
        "confirmed_flags": sum(1 for f in flags if f.status == "confirmed"),
        "dismissed_flags": sum(1 for f in flags if f.status == "dismissed")
    }
