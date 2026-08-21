import calendar
from datetime import date
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlmodel import Session, select

from auth import hash_password, verify_password, create_access_token, get_current_user
from database import get_session
from models import Transaction, Account, AccountType, Category, User
from schemas import (
    TransactionCreate,
    TransactionUpdate,
    CategorySummary,
    DailySummary,
    UserSignup,
    UserLogin,
    UserRead,
)

app = FastAPI(title="Budget Tracker AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days, matches JWT_EXPIRE_MINUTES in auth.py


def set_auth_cookie(response: Response, user_id: int) -> None:
    token = create_access_token(user_id)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=COOKIE_MAX_AGE,
    )


def _get_owned_account(account_id: int, current_user: User, session: Session) -> Account:
    """
    Look up an account and confirm it belongs to current_user.
    Returns 404 (not 403) if it doesn't exist OR belongs to someone else —
    this avoids confirming to a caller that an account id exists at all.
    """
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail=f"Account {account_id} not found")
    return account


def _get_owned_transaction(transaction_id: int, current_user: User, session: Session) -> Transaction:
    """
    Look up a transaction and confirm the account it belongs to is owned
    by current_user. Same 404-not-403 reasoning as _get_owned_account.
    """
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    account = session.get(Account, transaction.account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return transaction


def _validate_category(category_id: Optional[int], session: Session) -> None:
    """
    If a category_id is provided, confirm it corresponds to a real category
    before we let it anywhere near an INSERT/UPDATE. Without this, an invalid
    id (like 0) reaches the database, trips the foreign-key constraint, and
    surfaces as a raw, unhandled 500 instead of a clean 404.

    None is always valid — it just means "uncategorized" — so it skips this
    check entirely.
    """
    if category_id is None:
        return
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail=f"Category {category_id} not found")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/auth/signup", response_model=UserRead, status_code=201)
def signup(payload: UserSignup, response: Response, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    default_account = Account(user_id=user.id, name="Default Account", account_type=AccountType.checking)
    session.add(default_account)
    session.commit()

    set_auth_cookie(response, user.id)
    return user


@app.post("/auth/login", response_model=UserRead)
def login(payload: UserLogin, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    set_auth_cookie(response, user.id)
    return user


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "logged out"}


@app.get("/auth/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/accounts", response_model=List[Account])
def list_accounts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return session.exec(select(Account).where(Account.user_id == current_user.id)).all()


@app.get("/categories", response_model=List[Category])
def list_categories(session: Session = Depends(get_session)):
    # Intentionally NOT scoped to current_user — categories are a shared,
    # global list in this schema, not per-user data.
    return session.exec(select(Category)).all()


@app.get("/transactions/summary/by-category", response_model=List[CategorySummary])
def summary_by_category(
    month: Optional[str] = Query(default=None, description="YYYY-MM, defaults to current month"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if month:
        year, mon = map(int, month.split("-"))
    else:
        today = date.today()
        year, mon = today.year, today.month

    start = date(year, mon, 1)
    end = date(year, mon, calendar.monthrange(year, mon)[1])

    statement = (
        select(Category.name, func.sum(Transaction.amount))
        .select_from(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .where(
            Account.user_id == current_user.id,
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
    )
    results = session.exec(statement).all()
    return [CategorySummary(category=name or "Uncategorized", total=total) for name, total in results]


@app.get("/transactions/summary/by-date", response_model=List[DailySummary])
def summary_by_date(
    month: Optional[str] = Query(default=None, description="YYYY-MM, defaults to current month"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if month:
        year, mon = map(int, month.split("-"))
    else:
        today = date.today()
        year, mon = today.year, today.month

    start = date(year, mon, 1)
    end = date(year, mon, calendar.monthrange(year, mon)[1])

    statement = (
        select(Transaction.transaction_date, func.sum(Transaction.amount))
        .select_from(Transaction)
        .join(Account, Transaction.account_id == Account.id)
        .where(
            Account.user_id == current_user.id,
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        )
        .group_by(Transaction.transaction_date)
        .order_by(Transaction.transaction_date)
    )
    results = session.exec(statement).all()
    return [DailySummary(date=d, total=total) for d, total in results]


@app.post("/transactions", response_model=Transaction)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _get_owned_account(payload.account_id, current_user, session)
    _validate_category(payload.category_id, session)

    transaction = Transaction(**payload.model_dump())
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@app.get("/transactions", response_model=List[Transaction])
def list_transactions(
    account_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if account_id is not None:
        _get_owned_account(account_id, current_user, session)
        statement = select(Transaction).where(Transaction.account_id == account_id)
    else:
        statement = (
            select(Transaction)
            .join(Account, Transaction.account_id == Account.id)
            .where(Account.user_id == current_user.id)
        )
    return session.exec(statement).all()


@app.get("/transactions/{transaction_id}", response_model=Transaction)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return _get_owned_transaction(transaction_id, current_user, session)


@app.patch("/transactions/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    transaction = _get_owned_transaction(transaction_id, current_user, session)

    update_data = payload.model_dump(exclude_unset=True)

    if "category_id" in update_data:
        _validate_category(update_data["category_id"], session)
        if update_data["category_id"] != transaction.category_id:
            transaction.user_corrected = True

    for key, value in update_data.items():
        setattr(transaction, key, value)

    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@app.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    transaction = _get_owned_transaction(transaction_id, current_user, session)
    session.delete(transaction)
    session.commit()