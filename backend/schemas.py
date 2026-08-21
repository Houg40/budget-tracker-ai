from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel, Field


class TransactionCreate(SQLModel):
    account_id: int
    description: str
    amount: Decimal
    transaction_date: date
    category_id: Optional[int] = None


class TransactionUpdate(SQLModel):
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    transaction_date: Optional[date] = None
    category_id: Optional[int] = None


class CategorySummary(SQLModel):
    category: str
    total: Decimal


class DailySummary(SQLModel):
    date: date
    total: Decimal


class UserSignup(SQLModel):
    email: str
    password: str = Field(min_length=8, max_length=72)


class UserLogin(SQLModel):
    email: str
    password: str


class UserRead(SQLModel):
    id: int
    email: str
    created_at: datetime