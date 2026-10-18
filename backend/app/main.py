from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.deps import model_registry

# Route modules
from app.api.routes import (
    auth,
    store,
    dashboard,
    inventory,
    alerts,
    advisor,
    demand,
    b2b,
    fraud,
    analytics,
    suppliers,
    models_status,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and load AI models
    print("[STARTUP] Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)
    print("[STARTUP] Loading AI models into central registry...")
    model_registry.load_all()
    yield
    print("[SHUTDOWN] ShelfWise ERP API shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    description="ShelfWise ERP — AI-Powered Retail OS (Expiry risk, demand forecasting, discount optimization, B2B quotes, fraud watch)",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(store.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
app.include_router(alerts.router, prefix=settings.API_V1_PREFIX)
app.include_router(advisor.router, prefix=settings.API_V1_PREFIX)
app.include_router(demand.router, prefix=settings.API_V1_PREFIX)
app.include_router(b2b.router, prefix=settings.API_V1_PREFIX)
app.include_router(fraud.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(suppliers.router, prefix=settings.API_V1_PREFIX)
app.include_router(models_status.router, prefix=settings.API_V1_PREFIX)

@app.get("/api/health")
def health_check():
    status_info = model_registry.get_status()
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "models_loaded": status_info["loaded_count"],
        "total_models": status_info["total_models"]
    }

# Frontend SPA Static Serving & Catch-All Fallback
import os
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not intercept API routes
        if full_path.startswith("api"):
            return {"detail": "Not Found"}
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
