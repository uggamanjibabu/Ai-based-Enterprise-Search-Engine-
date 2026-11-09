import pytest
import os
import sys

# Ensure backend app is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(scope="session")
def admin_token(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@nexus.ai",
        "password": "Admin@12345"
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def employee_token(client):
    res = client.post("/api/auth/login", json={
        "email": "employee@nexus.ai",
        "password": "Employee@12345"
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

