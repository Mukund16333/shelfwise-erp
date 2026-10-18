"""
ShelfWise ERP — Database Seeder
===============================
Seeds a demo store with realistic products, batches, suppliers,
B2B customers, transactions, and daily sales history.
"""

from datetime import date, datetime, timedelta
import random
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models import (
    Store, User, Product, Batch, Supplier, B2BCustomer,
    B2BTransaction, FraudFlag, DailySale, PriceChange, AuditLog
)
from app.ml.registry import CATEGORIES

def seed():
    print("[SEED] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    existing_store = db.query(Store).filter(Store.name == "FreshMart Supermarket").first()
    if existing_store:
        print("[SEED] FreshMart Supermarket already exists. Skipping seed.")
        db.close()
        return

    print("[SEED] Creating demo Store: FreshMart Supermarket...")
    store = Store(
        name="FreshMart Supermarket",
        city="Chennai",
        currency_symbol="₹",
        manager_name="Ramesh Kumar",
        store_type="Supermarket / Food Retail",
        fiscal_year="FY 2026–27",
        fraud_threshold=0.65
    )
    db.add(store)
    db.flush()

    print("[SEED] Creating demo users (owner, manager, staff)...")
    owner = User(
        store_id=store.id,
        name="Ramesh Kumar",
        email="owner@freshmart.com",
        hashed_password=get_password_hash("admin123"),
        role="owner"
    )
    manager = User(
        store_id=store.id,
        name="Priya Sharma",
        email="manager@freshmart.com",
        hashed_password=get_password_hash("manager123"),
        role="manager"
    )
    staff = User(
        store_id=store.id,
        name="Karthik V",
        email="staff@freshmart.com",
        hashed_password=get_password_hash("staff123"),
        role="staff"
    )
    db.add_all([owner, manager, staff])
    db.flush()

    print("[SEED] Seeding suppliers...")
    suppliers_data = [
        ("Amul Dairy Cooperative", "Dairy", "Anand K", "supply@amul.coop", "+91 98401 11223", 2, 98.4, 185000.0),
        ("Britannia Bakers Hub", "Bakery", "Suresh M", "orders@britannia.in", "+91 98402 22334", 1, 95.0, 94000.0),
        ("Kaveri Agri Organics", "Fresh Produce", "Murugan R", "dispatch@kaveriagri.com", "+91 98403 33445", 1, 91.5, 142000.0),
        ("Heritage Beverages Ltd", "Beverages", "Venkatesh P", "b2b@heritagebev.com", "+91 98404 44556", 4, 96.2, 78000.0),
        ("Tata Consumer Wholesale", "Canned Goods, Snacks", "Deepa S", "corp@tataconsumer.com", "+91 98405 55667", 5, 97.0, 112000.0),
        ("Godrej Cold Chain Foods", "Frozen", "Rajesh G", "logistics@godrejfoods.com", "+91 98406 66778", 3, 93.8, 65000.0),
    ]
    for s_name, s_cats, s_cont, s_email, s_phone, s_lead, s_rel, s_spend in suppliers_data:
        sup = Supplier(
            store_id=store.id,
            name=s_name,
            categories=s_cats,
            contact=s_cont,
            email=s_email,
            phone=s_phone,
            lead_time_days=s_lead,
            reliability_score=s_rel,
            mtd_spend=s_spend,
            status="active"
        )
        db.add(sup)
    db.flush()

    print("[SEED] Seeding retail catalog products...")
    catalog = [
        # Dairy
        ("Full Cream Milk 1L", "Dairy", 68.0, 48.0, 7, "pack"),
        ("Greek Yogurt 400g", "Dairy", 95.0, 68.0, 12, "pc"),
        ("Fresh Malai Paneer 200g", "Dairy", 110.0, 82.0, 8, "pc"),
        ("Salted Table Butter 500g", "Dairy", 275.0, 215.0, 60, "pc"),
        ("Cheddar Cheese Block 200g", "Dairy", 185.0, 135.0, 45, "pc"),
        # Bakery
        ("Multigrain Bread 400g", "Bakery", 45.0, 30.0, 4, "pc"),
        ("Sourdough Artisanal Loaf", "Bakery", 95.0, 60.0, 4, "pc"),
        ("Butter Croissants 4pk", "Bakery", 140.0, 92.0, 3, "pack"),
        ("Whole Wheat Pav Buns 6pk", "Bakery", 40.0, 26.0, 4, "pack"),
        ("Vanilla Pound Cake 300g", "Bakery", 120.0, 75.0, 6, "pc"),
        # Fresh Produce
        ("Baby Spinach 250g", "Fresh Produce", 35.0, 22.0, 4, "pack"),
        ("Cherry Tomatoes 500g", "Fresh Produce", 70.0, 44.0, 6, "pack"),
        ("Broccoli Florets 500g", "Fresh Produce", 85.0, 55.0, 5, "pc"),
        ("Crisp Salad Greens 200g", "Fresh Produce", 55.0, 34.0, 3, "pack"),
        ("English Cucumbers 1kg", "Fresh Produce", 40.0, 25.0, 7, "kg"),
        # Beverages
        ("Alphonso Mango Pulp 1L", "Beverages", 190.0, 130.0, 180, "pc"),
        ("Cold Pressed Orange Juice 500ml", "Beverages", 120.0, 82.0, 10, "pc"),
        ("Sparkling Mineral Water 750ml", "Beverages", 65.0, 38.0, 365, "pc"),
        ("Roasted Filter Coffee 500g", "Beverages", 350.0, 240.0, 180, "pc"),
        # Canned Goods
        ("Organic Sweet Corn 400g", "Canned Goods", 85.0, 52.0, 730, "pc"),
        ("Red Kidney Beans 400g", "Canned Goods", 75.0, 46.0, 730, "pc"),
        ("Coconut Milk 400ml", "Canned Goods", 110.0, 72.0, 540, "pc"),
        # Snacks
        ("Sea Salt Roasted Almonds 200g", "Snacks", 280.0, 195.0, 180, "pc"),
        ("Peri Peri Makhana 100g", "Snacks", 140.0, 92.0, 120, "pc"),
        ("Baked Multigrain Chips 150g", "Snacks", 60.0, 38.0, 120, "pc"),
        # Frozen
        ("Green Peas Tender 1kg", "Frozen", 140.0, 95.0, 365, "pack"),
        ("Sweet Corn Kernels 500g", "Frozen", 95.0, 62.0, 365, "pack"),
        ("French Fries Classic 1.2kg", "Frozen", 210.0, 140.0, 270, "pack"),
    ]

    prod_objs = []
    for idx, (p_name, p_cat, p_price, p_cost, p_shelf, p_uom) in enumerate(catalog, start=1):
        prod = Product(
            store_id=store.id,
            name=p_name,
            category=p_cat,
            base_price=p_price,
            cost=p_cost,
            shelf_life_days=p_shelf,
            uom=p_uom,
            barcode=f"8901234{idx:05d}"
        )
        db.add(prod)
        prod_objs.append(prod)
    db.flush()

    print("[SEED] Seeding active batches with near-expiry & healthy batches...")
    today = date.today()
    batch_records = [
        # Near expiry (1-3 days) -> triggers Expiry Alerts & High/Medium Risk
        (0, 1, 34, 68.0, 48.0),   # Milk: expires tomorrow (1 day left)
        (5, 1, 42, 45.0, 30.0),   # Multigrain Bread: expires tomorrow
        (7, 2, 48, 140.0, 92.0),  # Croissants: 2 days left
        (10, 2, 56, 35.0, 22.0),  # Baby Spinach: 2 days left
        (13, 3, 38, 55.0, 34.0),  # Salad Greens: 3 days left
        (2, 2, 28, 110.0, 82.0),  # Paneer: 2 days left
        (16, 3, 24, 120.0, 82.0), # Fresh Orange Juice: 3 days left
        (11, 4, 91, 70.0, 44.0),  # Cherry Tomatoes: 4 days left
        (6, 3, 22, 95.0, 60.0),   # Sourdough: 3 days left

        # Safe batches (7-180 days)
        (0, 6, 85, 68.0, 48.0),
        (1, 10, 60, 95.0, 68.0),
        (3, 45, 120, 275.0, 215.0),
        (4, 35, 75, 185.0, 135.0),
        (15, 120, 90, 190.0, 130.0),
        (17, 300, 150, 65.0, 38.0),
        (18, 150, 80, 350.0, 240.0),
        (19, 500, 110, 85.0, 52.0),
        (22, 120, 70, 280.0, 195.0),
        (25, 240, 130, 140.0, 95.0),
        (27, 200, 85, 210.0, 140.0),
    ]

    for b_idx, (p_idx, days_to_exp, qty, cur_px, cost_px) in enumerate(batch_records, start=101):
        prod = prod_objs[p_idx]
        exp_d = today + timedelta(days=days_to_exp)
        ent_d = exp_d - timedelta(days=prod.shelf_life_days)
        b = Batch(
            store_id=store.id,
            product_id=prod.id,
            batch_code=f"B{today.year}-{b_idx}",
            entry_date=ent_d,
            expiry_date=exp_d,
            initial_qty=qty + 20,
            current_qty=qty,
            current_price=cur_px,
            cost_price=cost_px,
            status="active"
        )
        db.add(b)
    db.flush()

    print("[SEED] Seeding B2B wholesale customers...")
    b2b_data = [
        ("Hotel Saravana Bhavan", "gold", "Chennai", "K. Natarajan", "procurement@saravanabhavan.com", "+91 98410 00111"),
        ("Anjappar Chettinad Chain", "gold", "Chennai", "R. Palani", "supply@anjappar.com", "+91 98410 00222"),
        ("Sangeetha Veg Restaurant", "silver", "Chennai", "M. Suresh", "kitchen@sangeetha.in", "+91 98410 00333"),
        ("Madras Cafe & Bakery", "silver", "Chennai", "Arun Kumar", "bakery@madrascafe.com", "+91 98410 00444"),
        ("Adyar Ananda Bhavan (A2B)", "gold", "Chennai", "G. Raman", "bulk@a2b.com", "+91 98410 00555"),
        ("Annapoorna Caterers", "bronze", "Coimbatore", "S. Velu", "orders@annapoorna.co", "+91 98410 00666"),
        ("Express Coffee Bar", "bronze", "Bengaluru", "Naveen T", "beans@expresscoffee.in", "+91 98410 00777"),
        ("City Grocers Wholesale", "silver", "Madurai", "P. Kannan", "citygrocers@gmail.com", "+91 98410 00888"),
    ]
    b2b_objs = []
    for c_name, c_tier, c_city, c_cont, c_email, c_phone in b2b_data:
        cust = B2BCustomer(
            store_id=store.id,
            name=c_name,
            tier=c_tier,
            city=c_city,
            contact_person=c_cont,
            email=c_email,
            phone=c_phone
        )
        db.add(cust)
        b2b_objs.append(cust)
    db.flush()

    print("[SEED] Seeding B2B transactions & fraud watch flags...")
    random.seed(42)
    txns = []
    for _ in range(80):
        c = random.choice(b2b_objs)
        p = random.choice(prod_objs)
        qty = random.randint(10, 60)
        amt = round(qty * p.base_price, 2)
        pmode = random.choice(["cash", "credit", "upi", "cheque"])
        hour = random.randint(8, 20)
        d = today - timedelta(days=random.randint(1, 45))

        txn = B2BTransaction(
            store_id=store.id,
            customer_id=c.id,
            product_id=p.id,
            quantity=qty,
            amount=amt,
            payment_mode=pmode,
            hour=hour,
            txn_count_7d=random.randint(1, 8),
            customer_freq=random.randint(5, 25),
            date=d
        )
        db.add(txn)
        txns.append(txn)
    db.flush()

    # Seed 4 realistic anomalous transactions flagged for review (never say fraud)
    anomalies = [
        (b2b_objs[0], prod_objs[3], 450, 123750.0, "cash", 3, 0.89, "high", "High volume cash order placed at 03:00 AM"),
        (b2b_objs[5], prod_objs[18], 180, 63000.0, "credit", 2, 0.78, "medium", "New customer with sudden bulk order volume"),
        (b2b_objs[6], prod_objs[0], 500, 34000.0, "upi", 23, 0.74, "medium", "Late-night order exceeding customer 30-day average by 4x"),
        (b2b_objs[3], prod_objs[7], 280, 39200.0, "cheque", 4, 0.69, "medium", "Off-hours order with unusual payment instrument"),
    ]
    for c, p, qty, amt, pmode, hr, score, rlevel, reason in anomalies:
        anom_txn = B2BTransaction(
            store_id=store.id,
            customer_id=c.id,
            product_id=p.id,
            quantity=qty,
            amount=amt,
            payment_mode=pmode,
            hour=hr,
            txn_count_7d=1,
            customer_freq=2,
            date=today - timedelta(days=random.randint(1, 5))
        )
        db.add(anom_txn)
        db.flush()

        flag = FraudFlag(
            store_id=store.id,
            transaction_id=anom_txn.id,
            anomaly_score=score,
            risk_level=rlevel,
            reason=reason,
            status="pending"
        )
        db.add(flag)
    db.flush()

    print("[SEED] Seeding 30 days of daily sales for analytics & forecasting...")
    for day_offset in range(30, 0, -1):
        s_date = today - timedelta(days=day_offset)
        for p in prod_objs[:15]:
            sold_qty = random.randint(8, 35)
            wasted_qty = random.randint(0, 3) if p.category in ["Bakery", "Fresh Produce"] else 0
            sale = DailySale(
                store_id=store.id,
                product_id=p.id,
                date=s_date,
                sold=sold_qty,
                wasted=wasted_qty,
                price=p.base_price,
                cost=p.cost,
                stock_before=sold_qty + 20,
                stock_after=20
            )
            db.add(sale)

    db.commit()
    db.close()
    print("[SEED] [OK] FreshMart demo store successfully seeded with comprehensive data!")

if __name__ == "__main__":
    seed()
