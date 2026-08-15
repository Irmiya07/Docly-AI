from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.schema.auth_schema import (
    UserSignup,
    UserLogin,
    UserResponse,
    TokenResponse
)

from app.services.database import get_db

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def signup(user_data: UserSignup):

    db = get_db()

    username = user_data.username.lower().strip()
    email = user_data.email.lower().strip()

    if await db.users.find_one({"username": username}):
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    if await db.users.find_one({"email": email}):
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    user = {
        "username": username,
        "email": email,
        "password": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc)
    }

    await db.users.insert_one(user)

    return UserResponse(
        username=username,
        email=email
    )


@router.post(
    "/login",
    response_model=TokenResponse
)
async def login(credentials: UserLogin):

    db = get_db()

    username = credentials.username.lower().strip()

    user = await db.users.find_one(
        {"username": username}
    )

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )

    if not verify_password(
        credentials.password,
        user["password"]
    ):

        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )

    token = create_access_token(
        {
            "sub": user["username"],
            "user_id": str(user["_id"])
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user["username"],
            "email": user["email"]
        }
    }