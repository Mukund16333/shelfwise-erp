from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import Store, User, PriceChange, Batch, AuditLog, DailySale, Product, FraudFlag, B2BCustomer, B2BTransaction, Quote
from app.schemas.schemas import StoreResponse, StoreUpdate
from app.api.deps import get_current_user, get_current_store, require_roles

router = APIRouter(prefix="/store", tags=["Store Settings"])

@router.get("", response_model=StoreResponse)
def get_store(store: Store = Depends(get_current_store)):
    return store

@router.patch("", response_model=StoreResponse)
def update_store(
    data: StoreUpdate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner"])),
    db: Session = Depends(get_db)
):
    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter your store name."
            )
        store.name = data.name.strip()
    if data.city is not None:
        store.city = data.city.strip()
    if data.currency_symbol is not None:
        store.currency_symbol = data.currency_symbol.strip()
    if data.manager_name is not None:
        store.manager_name = data.manager_name.strip()
    if data.store_type is not None:
        store.store_type = data.store_type.strip()
    if data.fiscal_year is not None:
        store.fiscal_year = data.fiscal_year.strip()
    if data.fraud_threshold is not None:
        store.fraud_threshold = float(data.fraud_threshold)

    db.add(store)
    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="UPDATE_STORE",
        target_type="STORE",
        target_id=store.id,
        details="Updated store profile settings"
    )
    db.add(log)
    db.commit()
    db.refresh(store)
    return store

@router.post("/clear-discounts")
def clear_all_discounts(
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner"])),
    db: Session = Depends(get_db)
):
    active_changes = db.query(PriceChange).filter(
        PriceChange.store_id == store.id,
        PriceChange.is_active == True
    ).all()

    reversed_count = 0
    for pc in active_changes:
        batch = db.query(Batch).filter(Batch.id == pc.batch_id, Batch.store_id == store.id).first()
        if batch:
            batch.current_price = pc.old_price
            db.add(batch)
        pc.is_active = False
        db.add(pc)
        reversed_count += 1

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="CLEAR_DISCOUNTS",
        target_type="PRICE_CHANGE",
        details=f"Reversed {reversed_count} applied discounts across all batches."
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Successfully reversed {reversed_count} applied discounts.",
        "reversed_count": reversed_count
    }

@router.post("/reset")
def reset_store_data(
    payload: dict,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner"])),
    db: Session = Depends(get_db)
):
    confirmed_name = payload.get("store_name", "")
    if confirmed_name.strip() != store.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Store name confirmation mismatch. Expected '{store.name}'."
        )

    # Delete non-user store data
    db.query(PriceChange).filter(PriceChange.store_id == store.id).delete()
    db.query(DailySale).filter(DailySale.store_id == store.id).delete()
    db.query(FraudFlag).filter(FraudFlag.store_id == store.id).delete()
    db.query(Quote).filter(Quote.store_id == store.id).delete()
    db.query(B2BTransaction).filter(B2BTransaction.store_id == store.id).delete()
    db.query(Batch).filter(Batch.store_id == store.id).delete()

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="RESET_STORE_DATA",
        target_type="STORE",
        target_id=store.id,
        details="Reset all store inventory, sales, and transactions data."
    )
    db.add(log)
    db.commit()

    return {"message": "Store data successfully reset."}
