from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


def _utcnow() -> datetime:
    # datetime.utcnow() is deprecated (returns a naive datetime with no
    # tzinfo, which invites bugs); this is the timezone-aware replacement.
    return datetime.now(timezone.utc)


class AccountType(str, Enum):
    checking = "checking"
    savings = "savings"
    credit_card = "credit_card"
    cash = "cash"
    other = "other"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=_utcnow)


class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    name: str
    account_type: AccountType
    created_at: datetime = Field(default_factory=_utcnow)


class Category(SQLModel, table=True):
    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"

    id: Optional[int] = Field(default=None, primary_key=True)
    account_id: int = Field(foreign_key="accounts.id")
    category_id: Optional[int] = Field(default=None, foreign_key="categories.id")
    description: str
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    transaction_date: date
    ai_confidence: Optional[float] = None
    user_corrected: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow)