def test_signup_creates_user_and_default_account(client):
    response = client.post(
        "/auth/signup", json={"email": "alice@example.com", "password": "password123"}
    )
    assert response.status_code == 201
    assert response.json()["email"] == "alice@example.com"

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"

    accounts = client.get("/accounts")
    assert accounts.status_code == 200
    assert len(accounts.json()) == 1
    assert accounts.json()[0]["name"] == "Default Account"


def test_signup_with_duplicate_email_is_rejected(client):
    client.post("/auth/signup", json={"email": "bob@example.com", "password": "password123"})
    response = client.post(
        "/auth/signup", json={"email": "bob@example.com", "password": "password123"}
    )
    assert response.status_code == 400


def test_login_with_wrong_password_is_rejected(client):
    client.post("/auth/signup", json={"email": "carol@example.com", "password": "password123"})
    response = client.post(
        "/auth/login", json={"email": "carol@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_protected_routes_require_authentication(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/accounts").status_code == 401


def test_user_cannot_read_update_or_delete_another_users_account(client):
    client.post("/auth/signup", json={"email": "usera@example.com", "password": "password123"})
    account_a_id = client.get("/accounts").json()[0]["id"]

    client.post("/auth/logout")
    client.post("/auth/signup", json={"email": "userb@example.com", "password": "password123"})

    # B's own account list should never include A's account.
    b_accounts = client.get("/accounts").json()
    assert all(a["id"] != account_a_id for a in b_accounts)

    # Touching A's account by ID should look like it doesn't exist, not 403 -
    # matching the "never confirm a resource's existence" behavior the
    # README claims.
    assert client.patch(f"/accounts/{account_a_id}", json={"name": "Hacked"}).status_code == 404
    assert client.delete(f"/accounts/{account_a_id}").status_code == 404


def test_user_cannot_read_update_or_delete_another_users_transaction(client):
    client.post("/auth/signup", json={"email": "usera2@example.com", "password": "password123"})
    account_a_id = client.get("/accounts").json()[0]["id"]
    created = client.post(
        "/transactions",
        json={
            "account_id": account_a_id,
            "description": "Coffee",
            "amount": 4.5,
            "transaction_date": "2026-08-01",
        },
    )
    assert created.status_code == 200
    transaction_id = created.json()["id"]

    client.post("/auth/logout")
    client.post("/auth/signup", json={"email": "userb2@example.com", "password": "password123"})

    assert client.get(f"/transactions/{transaction_id}").status_code == 404
    assert (
        client.patch(f"/transactions/{transaction_id}", json={"description": "Hacked"}).status_code
        == 404
    )
    assert client.delete(f"/transactions/{transaction_id}").status_code == 404
