# ShelfWise ERP — AI-Powered Retail OS

> **Production-grade web application combining retail back-office operations with 5 machine-learning models to eliminate expiry waste, optimize dynamic markdowns, forecast demand, build B2B wholesale quotes, and flag transaction anomalies.**

---

## 🚀 Key Highlights & Architectural Compliance

Built in strict adherence to the **ShelfWise PRD (F1–F13)**, **App Flow**, **Backend Schema**, and **Design Brief**:

- **Honest AI Architecture**: Every prediction explicitly indicates its source (trained model vs rule-based fallback). No unverified or hardcoded accuracy figures.
- **Human-in-the-Loop Safeguards**: AI discount policies and fraud flags are recommendations until a manager or owner explicitly confirms them.
- **WCAG 2.1 Contrast & Design System**: Exact palette tokens (`--sb: #0f172a`, `--acc: #f59e0b`, semantic risk colors), tabular numeral alignment (`font-variant-numeric: tabular-nums`), and non-blocking skeleton states.
- **Multi-Tenant Data Isolation**: Store-scoped database tables with Role-Based Access Control (`owner`, `manager`, `staff`).

---

## 🤖 The 5 Machine Learning Models

| # | Feature | Model Architecture | Metric on Held-Out Test Set | Primary Output |
|---|---|---|---|---|
| **1** | **Expiry Waste Risk** | **XGBoost Classifier** | **AUC: 0.999 \| Acc: 97.9%** (Batch-level holdout) | Waste probability $0–1$ & risk level (`high` > 0.6, `medium` 0.3–0.6, `low` < 0.3) |
| **2** | **Demand Forecast** | **Ridge Regression** | **MAE: 2.35 units/day** (Temporal holdout) | Units/day projected clearance velocity |
| **3** | **Dynamic Markdown** | **Deep Q-Network (PyTorch)** | **Avg Reward: +4,108.6** | Optimal markdown action (0%–50% in 10% steps) |
| **4** | **B2B Recommender** | **NMF Collaborative Filtering** | **15 Latent Factors** | Top-4 product recommendations per buyer |
| **5** | **Fraud Watch** | **Isolation Forest** | **Contamination: 0.04** | Anomaly score $0–1$ and plain-language reason |

### Prediction Explanations (F12)
Powered by **SHAP (SHapley Additive exPlanations)**, the AI Advisor and Expiry Alerts explain individual feature contributions (days to expiry, current stock, sales run rate, cost, price) showing what raised or lowered the risk score, with the required disclaimer: *"Explanations describe model behavior and do not prove cause."*

---

## 📋 Features Implemented (F1–F13)

- **F1. Authentication & Store Setup**: Multi-tenant signup, login, store profile setup (name, city, currency symbol default ₹, manager name, store type, fiscal year), invitation workflow (`owner` invites `manager` and `staff`).
- **F2. Executive Dashboard**: 7 real-time KPI cards (Units Sold, Waste %, Average Price, Average Discount, Stock Turnover, Revenue MTD, Profit Margin), 15-day sales trend (solid slate line Chart.js), waste by category chart, top sellers table with quick inventory filtering, and 4 quick action shortcuts with live badge counts.
- **F3. Batch Inventory Management**: Real-time batch-level inventory table tracking product, category, batch code, stock, expiry days left (`ExpiryBar`), current price, cost, AI risk (`RiskPill`), debounced search, category filter, column sorting, Add Batch modal, Edit Batch modal.
- **F4. Expiry Waste Alerts & Saved Markdowns**: Prioritized list of near-expiry batches, stock at risk, potential waste loss ₹, model recommended discount. One-click "Apply X% discount" saves price changes with audit trails, turns card green with "Undo" capability, and decrements sidebar notification badge.
- **F5. AI Advisor (What-If Tool)**: Interactive simulation evaluating all 3 models in sequence, displaying expected units sold, suggested price, expected revenue & profit, and the Deep Q-Network Q-values across all 6 discount choices.
- **F6. Demand Forecast & Reorders**: Actual vs forecast daily sales curves (solid slate line vs dashed amber line), top products by projected volume, automated reorder recommendations comparing stock against forecast daily demand to prevent stockouts. Handles stores with under 7 days of sales.
- **F7. B2B Wholesale Hub & Quotes**: Customer directory with tier pills (Gold, Silver, Bronze), NMF product recommendations, spend comparison chart, and interactive Quote Generator with live line-item recalculation, "Copy as text", and "Print quote" generating sequential quote numbers (e.g., `QT-2026-0001`).
- **F8. Fraud Watch (Anomaly Review)**: Strict "flagged for review" copy (never "fraud" unless confirmed), Isolation Forest score distribution chart, feature importance chart, detail review drawer with reviewer status selection (`Confirmed`, `Dismissed`, `Needs follow-up`), review notes, and sensitivity slider setting.
- **F9. Retail Analytics**: 3 analytical views:
  1. *Pareto 80/20 Analysis*: Cumulative sales curve with Class A (top 80%), Class B (next 15%), Class C (5%) and 80% cutoff line.
  2. *Discount Impact*: Markdown percentage vs clearance velocity scatter.
  3. *Waste Deep Dive*: Category financial loss and actionable AI waste reduction directives.
- **F10. Suppliers**: Vendor directory, lead times, on-time reliability score %, MTD spend, reliability comparison chart, status toggle (`active` / `review`), Add & Edit supplier modal.
- **F11. Store Settings & Governance**: Store profile editor, AI model status card showing live loaded states and held-out validation metrics, data administration (clear all applied discounts, reset store data with store-name confirmation, team invites).
- **F12. SHAP Prediction Explanations**: Visual feature attribution bar charts for any batch.
- **F13. Data Import & Export**: CSV import with row-by-row validation for catalog products, batches, and sales; CSV export for inventory batches and analytics tables.

---

## ⚡ Quick Start & Running the Project

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Unified Run (FastAPI Serves Both Backend API & SPA Frontend)
```bash
# Navigate to backend
cd backend

# (Optional: models and seed data are already trained and seeded)
# python train_all.py
# python seed_data.py

# Start the unified server on port 8000
python -m uvicorn app.main:app --port 8000 --reload
```
Open **`http://localhost:8000`** in any web browser!

---

### 2. Frontend Developer Mode (with Vite HMR)
If you prefer running the Vite dev server separately on port 5173 with hot module reloading:
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --port 8000 --reload

# Terminal 2: Frontend
cd frontend
node ./node_modules/vite/bin/vite.js
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Pre-Configured Demo Credentials

The database comes pre-seeded with a complete store (**FreshMart Supermarket**, Chennai) with 3 role profiles:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Owner** | `owner@freshmart.com` | `admin123` | Full access to all 13 features & store settings |
| **Manager** | `manager@freshmart.com` | `manager123` | Operational access (pricing, B2B quotes, reorders, suppliers) |
| **Staff** | `staff@freshmart.com` | `staff123` | Batch entry, inventory check, read-only alerts view |

*(You can also click the quick login buttons directly on the Login screen!)*

---

## 📁 Repository Structure

```
shelfwise/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              ← JWT, RBAC, tenant isolation & registry injection
│   │   │   └── routes/              ← Feature routes (auth, store, dashboard, inventory,
│   │   │                               alerts, advisor, demand, b2b, fraud, analytics, suppliers, models)
│   │   ├── core/                    ← Config, security (PBKDF2/JWT), database setup
│   │   ├── models/                  ← SQLAlchemy multi-tenant ORM models
│   │   ├── schemas/                 ← Pydantic validation schemas
│   │   ├── ml/                      ← Model registry, PyTorch DQN, SHAP explainer
│   │   └── main.py                  ← FastAPI factory, lifespan loader, SPA static mount
│   ├── models/                      ← Saved trained AI model artifacts (.pkl, .pth)
│   ├── data/                        ← Synthetic retail training and sales datasets
│   ├── train_all.py                 ← Standalone model training pipeline
│   ├── seed_data.py                 ← Demo store database seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js            ← Fetch wrapper, JWT injection, INR currency formatter
│   │   ├── context/                 ← AuthContext (RBAC, live badges), ToastContext
│   │   ├── components/              ← Sidebar, TopBar, KPICard, RiskPill, ExpiryBar, Modal, ConfirmDialog, Skeleton
│   │   ├── pages/                   ← Login, Signup, StoreSetup, Dashboard, Inventory, Alerts,
│   │   │                               Advisor, Demand, B2BHub, FraudWatch, Analytics, Suppliers, Settings
│   │   ├── index.css                ← WCAG tokens, typography, tabular numbers
│   │   ├── App.jsx                  ← Route management & role access guard
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```
