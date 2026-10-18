from fastapi import APIRouter, Depends
from app.schemas.schemas import SystemModelStatus
from app.api.deps import get_model_registry
from app.ml.registry import ModelRegistry

router = APIRouter(prefix="/models", tags=["Model Status"])

@router.get("/status", response_model=SystemModelStatus)
def get_model_status(registry: ModelRegistry = Depends(get_model_registry)):
    status_data = registry.get_status()
    return status_data
