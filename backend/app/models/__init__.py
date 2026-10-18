from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    city = Column(String(100), default="Chennai")
    currency_symbol = Column(String(10), default="₹")
    manager_name = Column(String(100), default="")
    store_type = Column(String(100), default="Supermarket / Food Retail")
    fiscal_year = Column(String(50), default="FY 2026–27")
    fraud_threshold = Column(Float, default=0.65)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="store", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="store", cascade="all, delete-orphan")
    batches = relationship("Batch", back_populates="store", cascade="all, delete-orphan")
    customers = relationship("B2BCustomer", back_populates="store", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="store", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="store", cascade="all, delete-orphan")
    price_changes = relationship("PriceChange", back_populates="store", cascade="all, delete-orphan")
    daily_sales = relationship("DailySale", back_populates="store", cascade="all, delete-orphan")
    fraud_flags = relationship("FraudFlag", back_populates="store", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="store", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="owner")  # owner, manager, staff
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="users")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(120), nullable=False)
    role = Column(String(50), default="staff")
    token = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default="pending")  # pending, accepted
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False)  # Dairy, Bakery, Fresh Produce, Beverages, Canned Goods, Snacks, Frozen
    base_price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    shelf_life_days = Column(Integer, default=14)
    uom = Column(String(50), default="pc")
    barcode = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="products")
    batches = relationship("Batch", back_populates="product", cascade="all, delete-orphan")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    batch_code = Column(String(100), nullable=False)
    entry_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    initial_qty = Column(Integer, nullable=False)
    current_qty = Column(Integer, nullable=False)
    current_price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    status = Column(String(50), default="active")  # active, retired
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="batches")
    product = relationship("Product", back_populates="batches")
    price_changes = relationship("PriceChange", back_populates="batch", cascade="all, delete-orphan")


class PriceChange(Base):
    __tablename__ = "price_changes"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    discount_pct = Column(Integer, nullable=False)
    reason = Column(String(255), default="AI recommended discount")
    is_active = Column(Boolean, default=True)  # True = applied, False = undone
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="price_changes")
    batch = relationship("Batch", back_populates="price_changes")


class DailySale(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    sold = Column(Integer, default=0)
    wasted = Column(Integer, default=0)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    stock_before = Column(Integer, default=0)
    stock_after = Column(Integer, default=0)

    store = relationship("Store", back_populates="daily_sales")


class B2BCustomer(Base):
    __tablename__ = "b2b_customers"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    tier = Column(String(50), default="bronze")  # gold, silver, bronze
    city = Column(String(100), default="Chennai")
    contact_person = Column(String(100), default="")
    email = Column(String(120), default="")
    phone = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="customers")
    transactions = relationship("B2BTransaction", back_populates="customer", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="customer", cascade="all, delete-orphan")


class B2BTransaction(Base):
    __tablename__ = "b2b_transactions"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("b2b_customers.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="cash")  # cash, upi, credit, cheque
    hour = Column(Integer, default=12)
    txn_count_7d = Column(Integer, default=1)
    customer_freq = Column(Integer, default=1)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("B2BCustomer", back_populates="transactions")
    flags = relationship("FraudFlag", back_populates="transaction", cascade="all, delete-orphan")


class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("b2b_transactions.id", ondelete="CASCADE"), nullable=False)
    anomaly_score = Column(Float, nullable=False)
    risk_level = Column(String(50), default="medium")  # high, medium, low
    reason = Column(String(255), default="Unusual pattern")
    status = Column(String(50), default="pending")  # pending, confirmed, dismissed, needs_follow_up
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="fraud_flags")
    transaction = relationship("B2BTransaction", back_populates="flags")


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    quote_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("b2b_customers.id", ondelete="CASCADE"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    grand_total = Column(Float, default=0.0)
    status = Column(String(50), default="draft")  # draft, sent, accepted
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="quotes")
    customer = relationship("B2BCustomer", back_populates="quotes")
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)

    quote = relationship("Quote", back_populates="items")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    categories = Column(String(255), default="")
    contact = Column(String(100), default="")
    email = Column(String(120), default="")
    phone = Column(String(50), default="")
    lead_time_days = Column(Integer, default=3)
    reliability_score = Column(Float, default=95.0)
    last_order_date = Column(Date, nullable=True)
    mtd_spend = Column(Float, default=0.0)
    status = Column(String(50), default="active")  # active, review
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="suppliers")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=False)
    target_id = Column(Integer, nullable=True)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="audit_logs")


class AiPredictionLog(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String(100), nullable=False)
    input_payload = Column(Text, nullable=False)
    output_payload = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
