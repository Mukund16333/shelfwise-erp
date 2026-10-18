from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.config import settings
from app.models import User, Store
from app.ml.registry import ModelRegistry

security = HTTPBearer(auto_error=False)

# Singleton registry instance initialized with configured MODEL_DIR
model_registry = ModelRegistry(settings.MODEL_DIR)

def get_model_registry() -> ModelRegistry:
    return model_registry

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token."
        )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    return user

def get_current_store(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Store:
    store = db.query(Store).filter(Store.id == current_user.store_id).first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store associated with user does not exist."
        )
    return store

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles."
            )
        return current_user
    return role_checker
