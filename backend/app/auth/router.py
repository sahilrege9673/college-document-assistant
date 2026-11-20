from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import UserSignup, UserLogin, UserResponse, TokenResponse
from app.auth.security import get_password_hash, verify_password, create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserSignup, db: Session = Depends(get_db)):
    """Registers a new student account and returns an access token."""
    email_clean = data.email.strip().lower()

    # Check for existing user
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Determine role (predefined admin gets admin role, all others are students)
    role = "admin" if email_clean == settings.ADMIN_EMAIL.lower() else "student"

    hashed_pw = get_password_hash(data.password)
    user = User(
        full_name=data.full_name.strip(),
        email=email_clean,
        hashed_password=hashed_pw,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue access token
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})

    return TokenResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticates credentials and returns a signed JWT."""
    email_clean = data.username.strip().lower()

    # Auto-seed the predefined admin if logging in for the first time
    if email_clean == settings.ADMIN_EMAIL.lower():
        admin_user = db.query(User).filter(User.email == email_clean).first()
        if not admin_user:
            admin_user = User(
                full_name="College System Administrator",
                email=email_clean,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})

    return TokenResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and active role."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Stateless logout confirmation."""
    return {"message": "Successfully logged out"}
