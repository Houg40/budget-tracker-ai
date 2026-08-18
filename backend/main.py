import calendar
from datetime import date
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlmodel import Session, select

from database import get_session
from models import Transaction, Account, Category
from schemas import TransactionCreate, TransactionUpdate, CategorySummary, DailySummary

app = FastAPI(title="Budget Tracker AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/categories", response_model=List[Category])
def list_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()


@app.get("/transactions/summary/by-category", response_model=List[CategorySummary])
def summary_by_category(
    month: Optional[str] = Query(default=None, description="YYYY-MM, defaults to current month"),
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
        .join(Category, Transaction.category_id == Category.id, isouter=True)
        .where(Transaction.transaction_date >= start, Transaction.transaction_date <= end)
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
    )
    results = session.exec(statement).all()
    return [CategorySummary(category=name or "Uncategorized", total=total) for name, total in results]


@app.get("/transactions/summary/by-date", response_model=List[DailySummary])
def summary_by_date(
    month: Optional[str] = Query(default=None, description="YYYY-MM, defaults to current month"),
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
        .where(Transaction.transaction_date >= start, Transaction.transaction_date <= end)
        .group_by(Transaction.transaction_date)
        .order_by(Transaction.transaction_date)
    )
    results = session.exec(statement).all()
    return [DailySummary(date=d, total=total) for d, total in results]


@app.post("/transactions", response_model=Transaction)
def create_transaction(payload: TransactionCreate, session: Session = Depends(get_session)):
    account = session.get(Account, payload.account_id)
    if not account:
        raise HTTPException(status_code=404, detail=f"Account {payload.account_id} not found")

    transaction = Transaction(**payload.model_dump())
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@app.get("/transactions", response_model=List[Transaction])
def list_transactions(
    account_id: Optional[int] = Query(default=None),
    session: Session = Depends(get_session),
):
    statement = select(Transaction)
    if account_id is not None:
        statement = statement.where(Transaction.account_id == account_id)
    return session.exec(statement).all()


@app.get("/transactions/{transaction_id}", response_model=Transaction)
def get_transaction(transaction_id: int, session: Session = Depends(get_session)):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@app.patch("/transactions/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    session: Session = Depends(get_session),
):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "category_id" in update_data and update_data["category_id"] != transaction.category_id:
        transaction.user_corrected = True

    for key, value in update_data.items():
        setattr(transaction, key, value)

    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@app.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    session.delete(transaction)
    session.commit()