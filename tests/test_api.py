from island import lake, quiz, wordle


def start(client, player, game):
    return client.post(f"/api/games/{game}/start", json={"player_id": player["id"]})


def test_index_page(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Henry Island" in response.data
    assert "Content-Security-Policy" in response.headers


def test_create_player_validation(client, player):
    assert player["name"] == "Henry"
    assert player["total_score"] == 0
    assert player["unplayed"] == ["wordle", "lake", "quiz"]
    assert client.post("/api/players", json={"name": "henry", "avatar": "cat"}).status_code == 409
    assert client.post("/api/players", json={"name": "", "avatar": "cat"}).status_code == 400
    assert client.post("/api/players", json={"name": "<script>", "avatar": "cat"}).status_code == 400
    assert client.post("/api/players", json={"name": "Ann", "avatar": "dragon"}).status_code == 400


def test_change_avatar(client, player):
    response = client.put(f"/api/players/{player['id']}", json={"avatar": "penguin"})
    assert response.get_json()["avatar"] == "penguin"


def test_wordle_once_per_day(client, player, clock):
    data = start(client, player, "wordle").get_json()
    assert "answer" not in data["state"]
    secret = wordle.pick_daily_word("2025-12-06")
    response = client.post("/api/games/wordle/guess", json={"player_id": player["id"], "guess": secret})
    body = response.get_json()
    assert body["ok"] and body["state"]["won"] and body["state"]["score"] == 10

    status = client.get(f"/api/players/{player['id']}").get_json()
    assert status["total_score"] == 10
    assert "wordle" not in status["unplayed"]
    assert [g["status"] for g in status["games"]] == ["closed", "open", "open"]

    # Starting again the same day does not reset the game.
    again = start(client, player, "wordle").get_json()
    assert again["state"]["finished"]
    assert client.post("/api/games/wordle/guess", json={"player_id": player["id"], "guess": secret}).status_code == 400

    # Next day it is open again and the score accumulates.
    clock.now += 24 * 3600
    status = client.get(f"/api/players/{player['id']}").get_json()
    assert status["unplayed"] == ["wordle", "lake", "quiz"]
    assert status["total_score"] == 10 and status["today_score"] == 0
    assert not start(client, player, "wordle").get_json()["state"]["finished"]


def test_wordle_resume_in_progress(client, player):
    start(client, player, "wordle")
    client.post("/api/games/wordle/guess", json={"player_id": player["id"], "guess": "zzzzz"})
    client.post("/api/games/wordle/guess", json={"player_id": player["id"], "guess": "plumb"})
    state = start(client, player, "wordle").get_json()["state"]
    assert len(state["guesses"]) == (0 if wordle.pick_daily_word("2025-12-06") == "plumb" else 1)
    status = client.get(f"/api/players/{player['id']}").get_json()
    assert status["games"][0]["status"] in ("in_progress", "closed")


def test_lake_flow_and_timer(client, player, clock):
    state = start(client, player, "lake").get_json()["state"]
    assert len(state["letters"]) == 9 and "answer" not in state
    target = lake.pick_daily_word("2025-12-06")
    body = client.post("/api/games/lake/word", json={"player_id": player["id"], "word": target}).get_json()
    assert body["ok"] and body["points"] == 6
    clock.now += lake.TIME_LIMIT + 10
    body = client.post("/api/games/lake/word", json={"player_id": player["id"], "word": target[:3]}).get_json()
    assert not body["ok"] and body["state"]["finished"] and body["state"]["answer"] == target
    status = client.get(f"/api/players/{player['id']}").get_json()
    assert status["total_score"] == 6 and "lake" not in status["unplayed"]


def test_timed_game_closes_if_player_walks_away(client, player, clock):
    start(client, player, "quiz")
    clock.now += quiz.TIME_LIMIT + 10
    status = client.get(f"/api/players/{player['id']}").get_json()
    assert [g["status"] for g in status["games"]] == ["open", "open", "closed"]


def test_quiz_flow(client, player):
    state = start(client, player, "quiz").get_json()["state"]
    assert len(state["questions"]) == 10
    assert all("answer" not in q for q in state["questions"])
    answers = [q["answer"] for q in quiz.daily_questions("2025-12-06")]
    for i, correct in enumerate(answers):
        choice = correct if i % 2 == 0 else (correct + 1) % 4
        body = client.post("/api/games/quiz/answer", json={"player_id": player["id"], "question": i, "choice": choice}).get_json()
        assert body["correct"] == (i % 2 == 0)
    assert body["state"]["finished"] and body["state"]["score"] == 5
    board = client.get("/api/players").get_json()["players"]
    assert board[0]["total_score"] == 5


def test_finish_early_and_leaderboard_order(client, player):
    other = client.post("/api/players", json={"name": "Granny", "avatar": "owl"}).get_json()
    start(client, other, "quiz")
    first = quiz.daily_questions("2025-12-06")[0]["answer"]
    client.post("/api/games/quiz/answer", json={"player_id": other["id"], "question": 0, "choice": first})
    body = client.post("/api/games/quiz/finish", json={"player_id": other["id"]}).get_json()
    assert body["state"]["finished"]
    board = client.get("/api/players").get_json()["players"]
    assert [p["name"] for p in board] == ["Granny", "Henry"]


def test_errors(client, player):
    assert client.post("/api/games/chess/start", json={"player_id": player["id"]}).status_code == 404
    assert client.post("/api/games/wordle/start", json={"player_id": 999}).status_code == 404
    assert client.post("/api/games/wordle/start", json={}).status_code == 400
    assert client.post("/api/games/wordle/guess", json={"player_id": player["id"], "guess": "crane"}).status_code == 409
    assert client.post("/api/games/wordle/finish", json={"player_id": player["id"]}).status_code == 404
