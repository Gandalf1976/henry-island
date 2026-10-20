import pytest

from island import create_app, daily


class Clock:
    def __init__(self):
        self.now = 1_765_000_000.0  # a December day

    def __call__(self):
        return self.now


@pytest.fixture
def clock(monkeypatch):
    fake = Clock()
    monkeypatch.setattr(daily, "now", fake)
    monkeypatch.setenv("ISLAND_TIMEZONE", "UTC")
    return fake


@pytest.fixture
def app(tmp_path, clock):
    return create_app({"DATABASE": str(tmp_path / "test.db"), "TESTING": True})


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def player(client):
    response = client.post("/api/players", json={"name": "Henry", "avatar": "fox"})
    assert response.status_code == 201
    return response.get_json()
