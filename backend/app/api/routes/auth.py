import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models import User, Store, Invitation, AuditLog
from app.schemas.schemas import UserSignup, UserLogin, Token, UserResponse, UserInvite
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=Token)
def signup(data: UserSignup, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # 1. Create default empty Store for the owner
    store = Store(
        name="My Retail Store",
        city="Chennai",
        currency_symbol="₹",
        manager_name=data.name,
        store_type="Supermarket / Food Retail",
        fiscal_year="FY 2026–27"
    )
    db.add(store)
    db.flush()

    # 2. Create Owner User
    user = User(
        store_id=store.id,
        name=data.name,
        email=data.email.lower(),
        hashed_password=get_password_hash(data.password),
        role="owner"
    )
    db.add(user)
    db.flush()

    # Log audit entry
    log = AuditLog(
        store_id=store.id,
        user_id=user.id,
        action="SIGNUP",
        target_type="USER",
        target_id=user.id,
        details=f"Owner account created: {user.email}"
    )
    db.add(log)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "store_id": store.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    # Constant-time-like rejection with generic message
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect"
        )

    token = create_access_token({"sub": str(user.id), "store_id": user.store_id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out."}

@router.post("/invite")
def invite_user(
    data: UserInvite,
    current_user: User = Depends(require_roles(["owner"])),
    db: Session = Depends(get_db)
):
    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        store_id=current_user.store_id,
        email=data.email.lower(),
        role=data.role,
        token=token,
        status="pending"
    )
    db.add(invitation)
    db.commit()
    return {
        "message": f"Invitation created for {data.email} as {data.role}",
        "invite_token": token,
        "status": "pending"
    }
