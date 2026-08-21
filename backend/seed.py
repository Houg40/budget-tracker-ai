from sqlmodel import Session, select

from database import engine
from models import Category

DEFAULT_CATEGORIES = [
    "Groceries", "Dining", "Transport", "Subscriptions",
    "Rent", "Entertainment", "Income", "Other",
]


def seed():
    with Session(engine) as session:
        for name in DEFAULT_CATEGORIES:
            existing = session.exec(select(Category).where(Category.name == name)).first()
            if not existing:
                session.add(Category(name=name))
                print(f"Created category: {name}")
        session.commit()


if __name__ == "__main__":
    seed()