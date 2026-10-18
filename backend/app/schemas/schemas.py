from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr

# --- Auth & Store ---
class UserSignup(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    store_id: int
    name: str
    email: str
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserInvite(BaseModel):
    email: EmailStr
    role: str = Field("staff", pattern="^(manager|staff)$")

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    currency_symbol: Optional[str] = None
    manager_name: Optional[str] = None
    store_type: Optional[str] = None
    fiscal_year: Optional[str] = None
    fraud_threshold: Optional[float] = None

class StoreResponse(BaseModel):
    id: int
    name: str
    city: str
    currency_symbol: str
    manager_name: str
    store_type: str
    fiscal_year: str
    fraud_threshold: float
    created_at: datetime
    class Config:
        from_attributes = True

# --- Inventory & Batches ---
class ProductCreate(BaseModel):
    name: str
    category: str
    base_price: float = Field(..., gt=0)
    cost: float = Field(..., gt=0)
    shelf_life_days: int = Field(14, ge=1)
    uom: str = "pc"
    barcode: Optional[str] = ""

class ProductResponse(BaseModel):
    id: int
    store_id: int
    name: str
    category: str
    base_price: float
    cost: float
    shelf_life_days: int
    uom: str
    barcode: str
    class Config:
        from_attributes = True

class BatchCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    category: Optional[str] = "Dairy"
    batch_code: str
    entry_date: date
    expiry_date: date
    quantity: int = Field(..., gt=0)
    current_price: Optional[float] = None
    cost_price: float = Field(..., gt=0)

class BatchUpdate(BaseModel):
    current_qty: Optional[int] = None
    current_price: Optional[float] = None
    cost_price: Optional[float] = None
    status: Optional[str] = None

class BatchResponse(BaseModel):
    id: int
    store_id: int
    product_id: int
    product_name: str
    category: str
    batch_code: str
    entry_date: date
    expiry_date: date
    days_left: int
    initial_qty: int
    current_qty: int
    current_price: float
    cost_price: float
    ai_risk: float
    risk_label: str  # high, medium, low
    status: str
    is_discounted: bool = False
    original_price: Optional[float] = None
    applied_discount_pct: Optional[int] = None
    class Config:
        from_attributes = True

# --- Expiry Alerts ---
class ExpiryAlertItem(BaseModel):
    batch_id: int
    product_id: int
    product_name: str
    category: str
    batch_code: str
    days_left: int
    stock: int
    current_price: float
    cost_price: float
    potential_waste_value: float
    recommended_discount: int
    new_price: float
    ai_risk: float
    risk_label: str
    is_discounted: bool
    original_price: Optional[float] = None
    applied_discount_pct: Optional[int] = None

class ApplyDiscountRequest(BaseModel):
    discount_pct: int = Field(..., ge=0, le=90)
    reason: Optional[str] = "AI recommended markdown"

# --- AI Advisor ---
class AdvisorInput(BaseModel):
    days_left: int = Field(..., ge=0, le=365)
    stock: int = Field(..., ge=0)
    demand_rate: float = Field(..., ge=0)
    price: float = Field(..., gt=0)
    cost: float = Field(..., gt=0)
    price_change_count: int = Field(0, ge=0, le=20)
    lag1: float = Field(10, ge=0)
    lag2: float = Field(10, ge=0)
    category: str = "Dairy"
    shelf_life: int = Field(14, ge=1)

class AdvisorResponse(BaseModel):
    expiry_risk: float
    risk_label: str
    demand_forecast: int
    days_cover: float
    recommended_discount: int
    suggested_price: float
    expected_revenue: float
    expected_profit: float
    q_values: Dict[str, float]
    models_used: Dict[str, str]

class ExplainRequest(BaseModel):
    days_left: int
    stock: int
    demand_rate: float
    price: float
    cost: float

class FeatureImpact(BaseModel):
    feature: str
    display_name: str
    value: Any
    impact: float
    direction: str  # "increases_risk" or "decreases_risk"

class ExplainResponse(BaseModel):
    base_value: float
    risk_score: float
    features: List[FeatureImpact]
    disclaimer: str = "Explanations describe model behavior and do not prove cause."

# --- Demand & Reorder ---
class DemandForecastItem(BaseModel):
    date: str
    actual_sales: Optional[int] = None
    forecast_sales: int

class TopDemandProduct(BaseModel):
    product_id: int
    name: str
    category: str
    forecast_units: int

class ReorderItem(BaseModel):
    product_id: int
    name: str
    category: str
    current_stock: int
    forecast_demand_daily: float
    days_of_cover: float
    suggested_quantity: int
    unit_cost: float
    supplier_name: Optional[str] = None

# --- B2B Hub & Quotes ---
class B2BCustomerResponse(BaseModel):
    id: int
    name: str
    tier: str
    city: str
    contact_person: str
    email: str
    phone: str
    order_count: int
    total_spend: float
    last_order_date: Optional[str] = None
    recommended_products: List[Dict[str, Any]]
    class Config:
        from_attributes = True

class QuoteItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)

class QuoteCreate(BaseModel):
    customer_id: int
    items: List[QuoteItemCreate]

class QuoteItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    category: str
    quantity: int
    unit_price: float
    total: float
    class Config:
        from_attributes = True

class QuoteResponse(BaseModel):
    id: int
    quote_number: str
    customer_id: int
    customer_name: str
    customer_city: str
    grand_total: float
    status: str
    created_at: datetime
    items: List[QuoteItemResponse]
    class Config:
        from_attributes = True

# --- Fraud Watch ---
class FraudFlagItem(BaseModel):
    id: int
    transaction_id: int
    customer_name: str
    product_name: str
    quantity: int
    amount: float
    payment_mode: str
    hour: int
    date: str
    anomaly_score: float
    risk_level: str
    reason: str
    status: str
    review_note: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class FraudFlagUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|dismissed|needs_follow_up)$")
    review_note: Optional[str] = ""

# --- Suppliers ---
class SupplierCreate(BaseModel):
    name: str
    categories: str
    contact: str
    email: EmailStr
    phone: str
    lead_time_days: int = 3
    reliability_score: float = 95.0
    mtd_spend: float = 0.0
    status: str = "active"

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    categories: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    lead_time_days: Optional[int] = None
    reliability_score: Optional[float] = None
    mtd_spend: Optional[float] = None
    status: Optional[str] = None

class SupplierResponse(BaseModel):
    id: int
    name: str
    categories: str
    contact: str
    email: str
    phone: str
    lead_time_days: int
    reliability_score: float
    last_order_date: Optional[date] = None
    mtd_spend: float
    status: str
    class Config:
        from_attributes = True

# --- Model Status ---
class ModelMeta(BaseModel):
    name: str
    algorithm: str
    status: str  # "loaded", "fallback", "training"
    version: str
    trained_at: Optional[str] = None
    metrics: Dict[str, Any] = {}

class SystemModelStatus(BaseModel):
    total_models: int = 5
    loaded_count: int
    models: List[ModelMeta]
