from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models import Transaction, Account
from schemas import TransactionCreate, TransactionUpdate

app = FastAPI(title="Budget Tracker AI API")


@app.get("/health")
def health_check():
    return {"status": "ok"}


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