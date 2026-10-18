from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Store, User, Supplier, AuditLog
from app.schemas.schemas import SupplierResponse, SupplierCreate, SupplierUpdate
from app.api.deps import get_current_user, get_current_store, require_roles

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db)
):
    return db.query(Supplier).filter(Supplier.store_id == store.id).all()

@router.post("", response_model=SupplierResponse)
def create_supplier(
    data: SupplierCreate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager"])),
    db: Session = Depends(get_db)
):
    supplier = Supplier(
        store_id=store.id,
        name=data.name,
        categories=data.categories,
        contact=data.contact,
        email=data.email,
        phone=data.phone,
        lead_time_days=data.lead_time_days,
        reliability_score=data.reliability_score,
        mtd_spend=data.mtd_spend,
        status=data.status
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="CREATE_SUPPLIER",
        target_type="SUPPLIER",
        target_id=supplier.id,
        details=f"Added supplier {supplier.name}"
    )
    db.add(log)
    db.commit()

    return supplier

@router.patch("/{id}", response_model=SupplierResponse)
def update_supplier(
    id: int,
    data: SupplierUpdate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager"])),
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(Supplier.id == id, Supplier.store_id == store.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    if data.name is not None: supplier.name = data.name
    if data.categories is not None: supplier.categories = data.categories
    if data.contact is not None: supplier.contact = data.contact
    if data.email is not None: supplier.email = data.email
    if data.phone is not None: supplier.phone = data.phone
    if data.lead_time_days is not None: supplier.lead_time_days = data.lead_time_days
    if data.reliability_score is not None: supplier.reliability_score = data.reliability_score
    if data.mtd_spend is not None: supplier.mtd_spend = data.mtd_spend
    if data.status is not None: supplier.status = data.status

    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return supplier
