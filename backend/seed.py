from sqlmodel import Session, select

from database import engine
from models import User, Category, Account, AccountType

DEFAULT_CATEGORIES = [
    "Groceries", "Dining", "Transport", "Subscriptions",
    "Rent", "Entertainment", "Income", "Other",
]


def seed():
    with Session(engine) as session:
        user = session.exec(select(User)).first()
        if not user:
            user = User(email="placeholder@budget-tracker-ai.local")
            session.add(user)
            session.commit()
            session.refresh(user)
            print("Created placeholder user.")
        else:
            print("Placeholder user already exists, skipping.")

        for name in DEFAULT_CATEGORIES:
            existing = session.exec(select(Category).where(Category.name == name)).first()
            if not existing:
                session.add(Category(name=name))
                print(f"Created category: {name}")
        session.commit()

        existing_account = session.exec(
            select(Account).where(Account.user_id == user.id)
        ).first()
        if not existing_account:
            session.add(Account(user_id=user.id, name="Default Account", account_type=AccountType.checking))
            session.commit()
            print("Created default account.")
        else:
            print("Default account already exists, skipping.")


if __name__ == "__main__":
    seed()