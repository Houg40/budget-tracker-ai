from sqlmodel import Session, select

from database import engine
from models import User, Category

DEFAULT_CATEGORIES = [
    "Groceries", "Dining", "Transport", "Subscriptions",
    "Rent", "Entertainment", "Income", "Other",
]


def seed():
    with Session(engine) as session:
        existing_user = session.exec(select(User)).first()
        if not existing_user:
            session.add(User(email="placeholder@budget-tracker-ai.local"))
            print("Created placeholder user.")
        else:
            print("Placeholder user already exists, skipping.")

        for name in DEFAULT_CATEGORIES:
            existing = session.exec(select(Category).where(Category.name == name)).first()
            if not existing:
                session.add(Category(name=name))
                print(f"Created category: {name}")

        session.commit()


if __name__ == "__main__":
    seed()