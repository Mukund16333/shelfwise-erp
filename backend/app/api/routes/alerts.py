from datetime import date
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Store, User, Product, Batch, PriceChange, AuditLog
from app.schemas.schemas import ExpiryAlertItem, ApplyDiscountRequest
from app.api.deps import get_current_user, get_current_store, get_model_registry, require_roles
from app.ml.registry import ModelRegistry

router = APIRouter(prefix="/alerts", tags=["Expiry Alerts"])

@router.get("/expiry", response_model=List[ExpiryAlertItem])
def get_expiry_alerts(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    today = date.today()
    batches = (
        db.query(Batch, Product)
        .join(Product, Product.id == Batch.product_id)
        .filter(Batch.store_id == store.id, Batch.status == "active")
        .all()
    )

    active_discounts = {
        pc.batch_id: pc for pc in db.query(PriceChange).filter(
            PriceChange.store_id == store.id,
            PriceChange.is_active == True
        ).all()
    }

    alerts = []
    for b, p in batches:
        days_left = max(0, (b.expiry_date - today).days)
        # Alert window: within 7 days of expiry or high risk
        if days_left > 7 and b.id not in active_discounts:
            continue

        risk, label, _ = registry.predict_expiry_risk(
            days_left=days_left,
            stock=b.current_qty,
            demand_rate=max(1.0, b.current_qty / 7.0),
            price=b.current_price,
            cost=b.cost_price
        )

        is_disc = b.id in active_discounts
        disc_obj = active_discounts.get(b.id)

        # Recommendation
        opt_disc, _, _ = registry.predict_discount(
            days_left=days_left,
            stock=b.current_qty,
            forecast=max(1, int(b.current_qty / max(days_left, 1))),
            price_changes=1 if is_disc else 0,
            category=p.category,
            shelf_life=p.shelf_life_days
        )

        potential_waste = round(b.current_qty * b.cost_price, 2)
        base_or_old_price = disc_obj.old_price if is_disc else b.current_price
        rec_discount = disc_obj.discount_pct if is_disc else opt_disc
        new_price = round(base_or_old_price * (1.0 - rec_discount / 100.0), 2)

        alerts.append(ExpiryAlertItem(
            batch_id=b.id,
            product_id=p.id,
            product_name=p.name,
            category=p.category,
            batch_code=b.batch_code,
            days_left=days_left,
            stock=b.current_qty,
            current_price=b.current_price,
            cost_price=b.cost_price,
            potential_waste_value=potential_waste,
            recommended_discount=rec_discount,
            new_price=new_price,
            ai_risk=risk,
            risk_label=label,
            is_discounted=is_disc,
            original_price=disc_obj.old_price if is_disc else None,
            applied_discount_pct=disc_obj.discount_pct if is_disc else None
        ))

    alerts.sort(key=lambda x: (x.is_discounted, x.days_left))
    return alerts

@router.post("/{batch_id}/apply-discount")
def apply_discount(
    batch_id: int,
    req: ApplyDiscountRequest,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager"])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.store_id == store.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Check if already discounted
    existing_pc = db.query(PriceChange).filter(
        PriceChange.batch_id == batch_id,
        PriceChange.is_active == True
    ).first()

    old_price = existing_pc.old_price if existing_pc else batch.current_price
    new_price = round(old_price * (1.0 - req.discount_pct / 100.0), 2)

    if existing_pc:
        existing_pc.is_active = False
        db.add(existing_pc)

    pc = PriceChange(
        store_id=store.id,
        batch_id=batch.id,
        user_id=current_user.id,
        old_price=old_price,
        new_price=new_price,
        discount_pct=req.discount_pct,
        reason=req.reason or "AI recommended discount",
        is_active=True
    )
    db.add(pc)

    batch.current_price = new_price
    db.add(batch)

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="APPLY_DISCOUNT",
        target_type="BATCH",
        target_id=batch.id,
        details=f"Applied {req.discount_pct}% discount on {batch.batch_code} (from ₹{old_price} to ₹{new_price})"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "batch_id": batch.id,
        "old_price": old_price,
        "new_price": new_price,
        "discount_pct": req.discount_pct,
        "message": f"Applied {req.discount_pct}% discount. Price updated to ₹{new_price}."
    }

@router.post("/{batch_id}/undo-discount")
def undo_discount(
    batch_id: int,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager"])),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.store_id == store.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing_pc = db.query(PriceChange).filter(
        PriceChange.batch_id == batch_id,
        PriceChange.is_active == True
    ).first()

    if not existing_pc:
        raise HTTPException(status_code=400, detail="No active discount found on this batch.")

    original_price = existing_pc.old_price
    existing_pc.is_active = False
    db.add(existing_pc)

    batch.current_price = original_price
    db.add(batch)

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="UNDO_DISCOUNT",
        target_type="BATCH",
        target_id=batch.id,
        details=f"Undid discount on {batch.batch_code}, restored original price ₹{original_price}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "batch_id": batch.id,
        "restored_price": original_price,
        "message": f"Restored original price ₹{original_price}."
    }
