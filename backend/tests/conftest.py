import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from database import get_session
from main import app


@pytest.fixture(name="session")
def session_fixture():
    # In-memory SQLite, isolated per test. StaticPool keeps it as a single
    # shared connection for the lifetime of the test instead of a new
    # (and therefore empty) database per connection, which is SQLite's
    # normal in-memory behavior.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    # Swap out the app's real (Postgres) session dependency for one backed
    # by this test's throwaway in-memory database. The real DATABASE_URL
    # is never connected to during tests.
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
