from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models import Store, User, B2BCustomer, B2BTransaction, Product, Quote, QuoteItem, AuditLog
from app.schemas.schemas import B2BCustomerResponse, QuoteCreate, QuoteResponse, QuoteItemResponse
from app.api.deps import get_current_user, get_current_store, get_model_registry, require_roles
from app.ml.registry import ModelRegistry

router = APIRouter(prefix="/b2b", tags=["B2B Hub"])

@router.get("/customers", response_model=List[B2BCustomerResponse])
def get_customers(
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry)
):
    customers = db.query(B2BCustomer).filter(B2BCustomer.store_id == store.id).all()
    products_map = {p.id: p for p in db.query(Product).filter(Product.store_id == store.id).all()}

    res = []
    for c in customers:
        txns = db.query(B2BTransaction).filter(
            B2BTransaction.customer_id == c.id,
            B2BTransaction.store_id == store.id
        ).all()

        order_count = len(txns)
        total_spend = sum(t.amount for t in txns)
        last_order = max([t.date for t in txns]).isoformat() if txns else None

        # NMF recommendations
        rec_ids, model_src = registry.recommend_b2b(customer_id=c.id, top_n=4)
        rec_products = []
        for pid in rec_ids:
            if pid in products_map:
                prod = products_map[pid]
                rec_products.append({
                    "id": prod.id,
                    "name": prod.name,
                    "category": prod.category,
                    "base_price": prod.base_price,
                    "source": model_src
                })

        # If empty, add fallback products
        if not rec_products:
            for p in list(products_map.values())[:4]:
                rec_products.append({
                    "id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "base_price": p.base_price,
                    "source": "fallback"
                })

        res.append(B2BCustomerResponse(
            id=c.id,
            name=c.name,
            tier=c.tier,
            city=c.city,
            contact_person=c.contact_person,
            email=c.email,
            phone=c.phone,
            order_count=order_count,
            total_spend=round(total_spend, 2),
            last_order_date=last_order,
            recommended_products=rec_products
        ))

    return res

@router.post("/quotes", response_model=QuoteResponse)
def create_quote(
    data: QuoteCreate,
    store: Store = Depends(get_current_store),
    current_user: User = Depends(require_roles(["owner", "manager"])),
    db: Session = Depends(get_db)
):
    customer = db.query(B2BCustomer).filter(
        B2BCustomer.id == data.customer_id,
        B2BCustomer.store_id == store.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Generate sequential quote number e.g. QT-2026-0042
    quote_count = db.query(Quote).filter(Quote.store_id == store.id).count() + 1
    quote_num = f"QT-2026-{quote_count:04d}"

    grand_total = 0.0
    items_to_create = []

    for item in data.items:
        prod = db.query(Product).filter(Product.id == item.product_id, Product.store_id == store.id).first()
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found")

        total = round(item.quantity * item.unit_price, 2)
        grand_total += total
        items_to_create.append({
            "product_id": prod.id,
            "product_name": prod.name,
            "category": prod.category,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": total
        })

    quote = Quote(
        store_id=store.id,
        quote_number=quote_num,
        customer_id=customer.id,
        created_by_id=current_user.id,
        grand_total=round(grand_total, 2),
        status="sent"
    )
    db.add(quote)
    db.flush()

    res_items = []
    for it in items_to_create:
        qi = QuoteItem(
            quote_id=quote.id,
            product_id=it["product_id"],
            quantity=it["quantity"],
            unit_price=it["unit_price"],
            total=it["total"]
        )
        db.add(qi)
        db.flush()
        res_items.append(QuoteItemResponse(
            id=qi.id,
            product_id=it["product_id"],
            product_name=it["product_name"],
            category=it["category"],
            quantity=it["quantity"],
            unit_price=it["unit_price"],
            total=it["total"]
        ))

    log = AuditLog(
        store_id=store.id,
        user_id=current_user.id,
        action="CREATE_QUOTE",
        target_type="QUOTE",
        target_id=quote.id,
        details=f"Created quote {quote_num} for {customer.name} (Total: ₹{grand_total})"
    )
    db.add(log)
    db.commit()

    return QuoteResponse(
        id=quote.id,
        quote_number=quote.quote_number,
        customer_id=customer.id,
        customer_name=customer.name,
        customer_city=customer.city,
        grand_total=quote.grand_total,
        status=quote.status,
        created_at=quote.created_at,
        items=res_items
    )

@router.get("/quotes", response_model=List[QuoteResponse])
def list_quotes(
    customer_id: Optional[int] = None,
    store: Store = Depends(get_current_store),
    db: Session = Depends(get_db)
):
    q = db.query(Quote).filter(Quote.store_id == store.id)
    if customer_id:
        q = q.filter(Quote.customer_id == customer_id)
    quotes = q.order_by(Quote.created_at.desc()).all()

    res = []
    for quote in quotes:
        cust = db.query(B2BCustomer).filter(B2BCustomer.id == quote.customer_id).first()
        items = db.query(QuoteItem, Product).join(Product, Product.id == QuoteItem.product_id).filter(QuoteItem.quote_id == quote.id).all()
        item_responses = [
            QuoteItemResponse(
                id=qi.id,
                product_id=p.id,
                product_name=p.name,
                category=p.category,
                quantity=qi.quantity,
                unit_price=qi.unit_price,
                total=qi.total
            )
            for qi, p in items
        ]
        res.append(QuoteResponse(
            id=quote.id,
            quote_number=quote.quote_number,
            customer_id=cust.id if cust else 0,
            customer_name=cust.name if cust else "Unknown",
            customer_city=cust.city if cust else "",
            grand_total=quote.grand_total,
            status=quote.status,
            created_at=quote.created_at,
            items=item_responses
        ))
    return res
