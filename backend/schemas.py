from datetime import date
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel


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