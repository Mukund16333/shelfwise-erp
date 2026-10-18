import csv
import io
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Store, User, Product, Batch, PriceChange, AuditLog, DailySale
from app.schemas.schemas import BatchResponse, BatchCreate, BatchUpdate, ProductCreate, ProductResponse
from app.api.deps import get_current_user, get_current_store, get_model_registry, require_roles
from app.ml.registry import ModelRegistry, CATEGORIES

router = APIRouter(tags=["Inventory"])

@router.get("/batches", response_model=List[BatchResponse])
def get_batches(
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: Optional[str] = "days_left",
    sort_dir: Optional[str] = "asc",
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    query = (
        db.query(Batch, Product)
        .join(Product, Product.id == Batch.product_id)
        .filter(Batch.store_id == store.id, Batch.status == "active")
    )

    if category and category != "All":
        query = query.filter(Product.category == category)

    if search:
        s = f"%{search.lower()}%"
        query = query.filter(
            (Product.name.ilike(s)) | (Batch.batch_code.ilike(s))
        )

    results = query.all()
    today = date.today()

    # Get active discounts
    active_discounts = {
        pc.batch_id: pc for pc in db.query(PriceChange).filter(
            PriceChange.store_id == store.id,
            PriceChange.is_active == True
        ).all()
    }

    batch_list = []
    for b, p in results:
        days_left = max(0, (b.expiry_date - today).days)
        risk, label, _ = registry.predict_expiry_risk(
            days_left=days_left,
            stock=b.current_qty,
            demand_rate=max(1.0, b.current_qty / 10.0),
            price=b.current_price,
            cost=b.cost_price
        )

        is_disc = b.id in active_discounts
        disc_obj = active_discounts.get(b.id)

        batch_list.append(BatchResponse(
            id=b.id,
            store_id=b.store_id,
            product_id=p.id,
            product_name=p.name,
            category=p.category,
            batch_code=b.batch_code,
            entry_date=b.entry_date,
            expiry_date=b.expiry_date,
            days_left=days_left,
            initial_qty=b.initial_qty,
            current_qty=b.current_qty,
            current_price=b.current_price,
            cost_price=b.cost_price,
            ai_risk=risk,
            risk_label=label,
            status=b.status,
            is_discounted=is_disc,
            original_price=disc_obj.old_price if is_disc else None,
            applied_discount_pct=disc_obj.discount_pct if is_disc else None
        ))

    # Sorting
    reverse = (sort_dir.lower() == "desc")
    if sort_by == "days_left":
        batch_list.sort(key=lambda x: x.days_left, reverse=reverse)
    elif sort_by == "current_qty":
        batch_list.sort(key=lambda x: x.current_qty, reverse=reverse)
    elif sort_by == "current_price":
        batch_list.sort(key=lambda x: x.current_price, reverse=reverse)
    elif sort_by == "ai_risk":
        batch_list.sort(key=lambda x: x.ai_risk, reverse=reverse)
    elif sort_by == "product_name":
        batch_list.sort(key=lambda x: x.product_name.lower(), reverse=reverse)

    return batch_list

@router.post("/batches", response_model=BatchResponse)
def create_batch(
    data: BatchCreate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager", "staff"])),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    # Find or create product
    product = None
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id, Product.store_id == store.id).first()

    if not product and data.product_name:
        product = Product(
            store_id=store.id,
            name=data.product_name,
            category=data.category or "Dairy",
            base_price=data.current_price or round(data.cost_price * 1.4, 2),
            cost=data.cost_price,
            shelf_life_days=max(1, (data.expiry_date - data.entry_date).days),
            uom="pc"
        )
        db.add(product)
        db.flush()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid product_id or product_name must be specified."
        )

    current_price = data.current_price or product.base_price

    batch = Batch(
        store_id=store.id,
        product_id=product.id,
        batch_code=data.batch_code,
        entry_date=data.entry_date,
        expiry_date=data.expiry_date,
        initial_qty=data.quantity,
        current_qty=data.quantity,
        current_price=current_price,
        cost_price=data.cost_price,
        status="active"
    )
    db.add(batch)
    db.flush()

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="ADD_BATCH",
        target_type="BATCH",
        target_id=batch.id,
        details=f"Created batch {batch.batch_code} for {product.name} (qty: {batch.initial_qty})"
    )
    db.add(log)
    db.commit()
    db.refresh(batch)

    days_left = max(0, (batch.expiry_date - date.today()).days)
    risk, label, _ = registry.predict_expiry_risk(
        days_left=days_left,
        stock=batch.current_qty,
        demand_rate=max(1.0, batch.current_qty / 10.0),
        price=batch.current_price,
        cost=batch.cost_price
    )

    return BatchResponse(
        id=batch.id,
        store_id=batch.store_id,
        product_id=product.id,
        product_name=product.name,
        category=product.category,
        batch_code=batch.batch_code,
        entry_date=batch.entry_date,
        expiry_date=batch.expiry_date,
        days_left=days_left,
        initial_qty=batch.initial_qty,
        current_qty=batch.current_qty,
        current_price=batch.current_price,
        cost_price=batch.cost_price,
        ai_risk=risk,
        risk_label=label,
        status=batch.status,
        is_discounted=False
    )

@router.patch("/batches/{id}", response_model=BatchResponse)
def update_batch(
    id: int,
    data: BatchUpdate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager", "staff"])),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    batch = db.query(Batch).filter(Batch.id == id, Batch.store_id == store.id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if data.current_qty is not None:
        batch.current_qty = data.current_qty
    if data.current_price is not None:
        batch.current_price = data.current_price
    if data.cost_price is not None:
        batch.cost_price = data.cost_price
    if data.status is not None:
        batch.status = data.status

    db.add(batch)
    db.commit()
    db.refresh(batch)

    product = db.query(Product).filter(Product.id == batch.product_id).first()
    days_left = max(0, (batch.expiry_date - date.today()).days)
    risk, label, _ = registry.predict_expiry_risk(
        days_left=days_left,
        stock=batch.current_qty,
        demand_rate=max(1.0, batch.current_qty / 10.0),
        price=batch.current_price,
        cost=batch.cost_price
    )

    return BatchResponse(
        id=batch.id,
        store_id=batch.store_id,
        product_id=product.id,
        product_name=product.name,
        category=product.category,
        batch_code=batch.batch_code,
        entry_date=batch.entry_date,
        expiry_date=batch.expiry_date,
        days_left=days_left,
        initial_qty=batch.initial_qty,
        current_qty=batch.current_qty,
        current_price=batch.current_price,
        cost_price=batch.cost_price,
        ai_risk=risk,
        risk_label=label,
        status=batch.status,
        is_discounted=False
    )

@router.get("/products", response_model=List[ProductResponse])
def get_products(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db)
):
    return db.query(Product).filter(Product.store_id == store.id).all()

@router.post("/products", response_model=ProductResponse)
def create_product(
    data: ProductCreate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager", "staff"])),
    db: Session = Depends(get_db)
):
    prod = Product(
        store_id=store.id,
        name=data.name,
        category=data.category,
        base_price=data.base_price,
        cost=data.cost,
        shelf_life_days=data.shelf_life_days,
        uom=data.uom,
        barcode=data.barcode or ""
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@router.get("/exports/batches.csv")
def export_batches_csv(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    batches = (
        db.query(Batch, Product)
        .join(Product, Product.id == Batch.product_id)
        .filter(Batch.store_id == store.id, Batch.status == "active")
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Product Name", "Category", "Batch Code", "Entry Date",
        "Expiry Date", "Days Left", "Current Stock", "Current Price",
        "Cost Price", "AI Risk Score", "Risk Level"
    ])

    today = date.today()
    for b, p in batches:
        days_left = max(0, (b.expiry_date - today).days)
        risk, label, _ = registry.predict_expiry_risk(
            days_left=days_left,
            stock=b.current_qty,
            demand_rate=max(1.0, b.current_qty / 10.0),
            price=b.current_price,
            cost=b.cost_price
        )
        writer.writerow([
            p.name, p.category, b.batch_code, b.entry_date.isoformat(),
            b.expiry_date.isoformat(), days_left, b.current_qty,
            b.current_price, b.cost_price, risk, label
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=shelfwise_batches.csv"}
    )

@router.post("/imports/{import_type}")
async def import_csv(
    import_type: str,
    file: UploadFile = File(...),
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager", "staff"])),
    db: Session = Depends(get_db)
):
    if import_type not in ["products", "batches", "sales"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid import type. Must be 'products', 'batches', or 'sales'."
        )

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV.")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty.")

    errors = []
    valid_items = []

    # Validate row-by-row
    for idx, row in enumerate(rows, start=2):  # 1-indexed header is row 1
        row_errors = []

        if import_type == "products":
            name = row.get("name", "").strip()
            cat = row.get("category", "").strip()
            if not name:
                row_errors.append("Product name is required.")
            if cat not in CATEGORIES:
                row_errors.append(f"Category '{cat}' is invalid. Allowed: {CATEGORIES}")
            try:
                base_price = float(row.get("base_price", 0))
                if base_price <= 0: row_errors.append("base_price must be > 0.")
            except ValueError:
                row_errors.append("base_price must be a number.")
            try:
                cost = float(row.get("cost", 0))
                if cost <= 0: row_errors.append("cost must be > 0.")
            except ValueError:
                row_errors.append("cost must be a number.")

            if row_errors:
                errors.append({"row": idx, "errors": row_errors})
            else:
                valid_items.append({
                    "store_id": store.id,
                    "name": name,
                    "category": cat,
                    "base_price": float(row["base_price"]),
                    "cost": float(row["cost"]),
                    "shelf_life_days": int(row.get("shelf_life_days", 14)),
                    "uom": row.get("uom", "pc"),
                    "barcode": row.get("barcode", "")
                })

        elif import_type == "batches":
            b_code = row.get("batch_code", "").strip()
            if not b_code:
                row_errors.append("batch_code is required.")
            try:
                p_id = int(row.get("product_id", 0))
                p_exists = db.query(Product).filter(Product.id == p_id, Product.store_id == store.id).first()
                if not p_exists:
                    row_errors.append(f"product_id {p_id} does not exist in your store.")
            except ValueError:
                row_errors.append("product_id must be an integer.")

            try:
                e_date = datetime.strptime(row.get("entry_date", ""), "%Y-%m-%d").date()
            except ValueError:
                row_errors.append("entry_date must be YYYY-MM-DD format.")

            try:
                exp_date = datetime.strptime(row.get("expiry_date", ""), "%Y-%m-%d").date()
            except ValueError:
                row_errors.append("expiry_date must be YYYY-MM-DD format.")

            try:
                qty = int(row.get("quantity", 0))
                if qty <= 0: row_errors.append("quantity must be > 0.")
            except ValueError:
                row_errors.append("quantity must be an integer.")

            try:
                cost_p = float(row.get("cost_price", 0))
                if cost_p <= 0: row_errors.append("cost_price must be > 0.")
            except ValueError:
                row_errors.append("cost_price must be a number.")

            if row_errors:
                errors.append({"row": idx, "errors": row_errors})
            else:
                cur_p = float(row.get("current_price", cost_p * 1.35))
                valid_items.append({
                    "store_id": store.id,
                    "product_id": p_id,
                    "batch_code": b_code,
                    "entry_date": e_date,
                    "expiry_date": exp_date,
                    "initial_qty": qty,
                    "current_qty": qty,
                    "current_price": cur_p,
                    "cost_price": cost_p,
                    "status": "active"
                })

    # PRD Acceptance Criteria F13: "Only a fully valid file can be confirmed, then POST /imports/{type}"
    if errors:
        return {
            "success": False,
            "total_rows": len(rows),
            "valid_rows": len(valid_items),
            "error_count": len(errors),
            "errors": errors[:50]  # Return first 50 errors
        }

    # If valid, insert into DB
    if import_type == "products":
        for item in valid_items:
            db.add(Product(**item))
    elif import_type == "batches":
        for item in valid_items:
            db.add(Batch(**item))

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action=f"IMPORT_{import_type.upper()}",
        target_type=import_type.upper(),
        details=f"Imported {len(valid_items)} rows successfully."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "total_rows": len(rows),
        "imported_rows": len(valid_items),
        "error_count": 0,
        "message": f"Successfully imported {len(valid_items)} {import_type} records."
    }
