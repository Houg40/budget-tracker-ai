from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from sqlmodel import SQLModel, Field

from models import AccountType


class AccountCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)
    account_type: AccountType


class AccountUpdate(SQLModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    account_type: Optional[AccountType] = None


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


class CsvImportPreviewRequest(SQLModel):
    account_id: int
    csv_text: str


class CsvImportRow(SQLModel):
    row_number: int
    status: str  # "valid" | "error" | "duplicate"
    description: str
    amount: Optional[Decimal] = None
    transaction_date: Optional[date] = None
    error_message: Optional[str] = None


class CsvImportPreviewResponse(SQLModel):
    rows: List[CsvImportRow]
    valid_count: int
    error_count: int
    duplicate_count: int


class CsvImportTransaction(SQLModel):
    description: str
    amount: Decimal
    transaction_date: date


class CsvImportCommitRequest(SQLModel):
    account_id: int
    transactions: List[CsvImportTransaction]


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