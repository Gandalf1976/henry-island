"""Henry Island - a snowy island of daily family mini games."""

import json
import os
import re

from flask import Flask, abort, jsonify, render_template, request

from . import daily, lake, quiz, wordle
from .db import get_db, init_db

GAMES = {
    wordle.GAME_ID: {
        "name": "Henry-Wordle",
        "description": "Guess the secret five letter word in six tries.",
    },
    lake.GAME_ID: {
        "name": "Henry-Lake",
        "description": f"Make as many words as you can from nine letters in {lake.TIME_LIMIT} seconds.",
    },
    quiz.GAME_ID: {
        "name": "Henry-Quiz",
        "description": f"Answer {quiz.NUM_QUESTIONS} questions in {quiz.TIME_LIMIT} seconds.",
    },
}
TIMED_GAMES = {lake.GAME_ID: lake.TIME_LIMIT, quiz.GAME_ID: quiz.TIME_LIMIT}
TIME_GRACE = 2  # seconds allowed for network delays on timed games

AVATARS = ["fox", "cat", "bear", "bunny", "penguin", "frog", "dog", "owl"]
NAME_PATTERN = re.compile(r"^[\w][\w '\-.]{0,19}$")


def default_database_path():
    if os.environ.get("ISLAND_DATABASE"):
        return os.environ["ISLAND_DATABASE"]
    if os.environ.get("WEBSITE_SITE_NAME"):
        # Running on Azure App Service: /home is persistent storage.
        return "/home/data/henry-island.db"
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance", "henry-island.db")


def create_app(config=None):
    app = Flask(__name__)
    app.config["DATABASE"] = default_database_path()
    app.json.ensure_ascii = False
    if config:
        app.config.update(config)
    init_db(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'",
        )
        return response

    @app.errorhandler(400)
    @app.errorhandler(404)
    @app.errorhandler(409)
    def json_error(error):
        if request.path.startswith("/api/"):
            return jsonify({"ok": False, "error": error.description}), error.code
        return error

    @app.get("/")
    def index():
        return render_template("index.html", games=GAMES, avatars=AVATARS)

    @app.get("/api/players")
    def list_players():
        return jsonify({"date": daily.today(), "players": leaderboard()})

    @app.post("/api/players")
    def create_player():
        body = request.get_json(silent=True) or {}
        name = " ".join(str(body.get("name", "")).split())
        avatar = body.get("avatar")
        if not NAME_PATTERN.match(name):
            abort(400, "Please choose a name of 1-20 letters or numbers.")
        if avatar not in AVATARS:
            abort(400, "Please choose one of the avatars.")
        db = get_db()
        if db.execute("SELECT 1 FROM players WHERE name = ?", (name,)).fetchone():
            abort(409, "Somebody on the island already has that name.")
        cursor = db.execute(
            "INSERT INTO players (name, avatar, created_at) VALUES (?, ?, ?)", (name, avatar, daily.now())
        )
        return jsonify(player_status(cursor.lastrowid)), 201

    @app.get("/api/players/<int:player_id>")
    def get_player(player_id):
        return jsonify(player_status(player_id))

    @app.put("/api/players/<int:player_id>")
    def update_player(player_id):
        body = request.get_json(silent=True) or {}
        if body.get("avatar") not in AVATARS:
            abort(400, "Please choose one of the avatars.")
        find_player(player_id)
        get_db().execute("UPDATE players SET avatar = ? WHERE id = ?", (body["avatar"], player_id))
        return jsonify(player_status(player_id))

    @app.post("/api/games/<game>/start")
    def start_game(game):
        if game not in GAMES:
            abort(404, "There is no such game on the island.")
        player_id = body_player_id()
        date = daily.today()
        now = daily.now()
        db = get_db()
        db.execute("BEGIN IMMEDIATE")
        try:
            expire_timed_plays()
            row = load_play(player_id, game, date)
            if row is None:
                if game == wordle.GAME_ID:
                    state = wordle.new_state(wordle.pick_daily_word(date))
                elif game == lake.GAME_ID:
                    state = lake.new_state(date, now)
                else:
                    state = quiz.new_state(date, now)
                db.execute(
                    "INSERT INTO plays (player_id, game, play_date, started_at, state) VALUES (?, ?, ?, ?, ?)",
                    (player_id, game, date, now, json.dumps(state)),
                )
                row = load_play(player_id, game, date)
            db.execute("COMMIT")
        except BaseException:
            db.execute("ROLLBACK")
            raise
        state = row_state(row)
        return jsonify({"ok": True, "game": game, "state": public_state(game, state, now)})

    @app.post("/api/games/wordle/guess")
    def wordle_guess():
        guess = (request.get_json(silent=True) or {}).get("guess")
        return update_game(wordle.GAME_ID, lambda state, now: wordle.apply_guess(state, str(guess or "")))

    @app.post("/api/games/lake/word")
    def lake_word():
        word = (request.get_json(silent=True) or {}).get("word")

        def submit(state, now):
            return {"points": lake.submit_word(state, str(word or ""), now, TIME_GRACE)}

        return update_game(lake.GAME_ID, submit)

    @app.post("/api/games/quiz/answer")
    def quiz_answer():
        body = request.get_json(silent=True) or {}
        index, choice = body.get("question"), body.get("choice")
        if not isinstance(index, int) or isinstance(index, bool):
            abort(400, "Unknown question.")
        if isinstance(choice, bool):
            choice = None

        def submit(state, now):
            return {"correct": quiz.answer(state, index, choice, now, TIME_GRACE)}

        return update_game(quiz.GAME_ID, submit)

    @app.post("/api/games/<game>/finish")
    def finish_game(game):
        if game not in TIMED_GAMES:
            abort(404, "Only timed games can be finished early.")

        def finish(state, now):
            state["finished"] = True

        return update_game(game, finish)

    return app


def body_player_id():
    body = request.get_json(silent=True) or {}
    player_id = body.get("player_id")
    if not isinstance(player_id, int) or isinstance(player_id, bool):
        abort(400, "Please choose who you are first.")
    find_player(player_id)
    return player_id


def find_player(player_id):
    row = get_db().execute("SELECT id, name, avatar FROM players WHERE id = ?", (player_id,)).fetchone()
    if row is None:
        abort(404, "That islander could not be found.")
    return row


def load_play(player_id, game, date):
    return get_db().execute(
        "SELECT * FROM plays WHERE player_id = ? AND game = ? AND play_date = ?", (player_id, game, date)
    ).fetchone()


def row_state(row):
    state = json.loads(row["state"])
    state["finished"] = bool(state.get("finished") or row["finished"])
    return state


def expire_timed_plays():
    """Close timed games whose clock has run out (e.g. the player left)."""
    now = daily.now()
    for game, limit in TIMED_GAMES.items():
        get_db().execute(
            "UPDATE plays SET finished = 1 WHERE finished = 0 AND game = ? AND started_at < ?",
            (game, now - limit - TIME_GRACE),
        )


def public_state(game, state, now):
    if game == wordle.GAME_ID:
        return wordle.public_state(state)
    if game == lake.GAME_ID:
        return lake.public_state(state, now)
    return quiz.public_state(state, now)


def update_game(game, action):
    """Run ``action(state, now)`` against the player's game for today."""
    player_id = body_player_id()
    date = daily.today()
    now = daily.now()
    db = get_db()
    db.execute("BEGIN IMMEDIATE")
    try:
        expire_timed_plays()
        row = load_play(player_id, game, date)
        if row is None:
            abort(409, "Start the game first.")
        state = row_state(row)
        error, extra = None, {}
        try:
            extra = action(state, now) or {}
        except daily.GameError as exc:
            error = exc.args[0] if exc.args else "That didn't work."
        db.execute(
            "UPDATE plays SET state = ?, score = ?, finished = ? WHERE id = ?",
            (json.dumps(state), state["score"], int(state["finished"]), row["id"]),
        )
        db.execute("COMMIT")
    except BaseException:
        db.execute("ROLLBACK")
        raise
    body = {"ok": error is None, "game": game, "state": public_state(game, state, now), **extra}
    if error:
        body["error"] = error
    return jsonify(body), 200 if error is None else 400


def leaderboard():
    expire_timed_plays()
    rows = get_db().execute(
        """
        SELECT p.id, p.name, p.avatar,
               COALESCE(SUM(pl.score), 0) AS total_score,
               COALESCE(SUM(CASE WHEN pl.play_date = ? THEN pl.score END), 0) AS today_score
        FROM players p LEFT JOIN plays pl ON pl.player_id = p.id
        GROUP BY p.id
        ORDER BY total_score DESC, p.name COLLATE NOCASE
        """,
        (daily.today(),),
    ).fetchall()
    return [dict(row) for row in rows]


def player_status(player_id):
    player = find_player(player_id)
    expire_timed_plays()
    date = daily.today()
    db = get_db()
    total = db.execute("SELECT COALESCE(SUM(score), 0) FROM plays WHERE player_id = ?", (player_id,)).fetchone()[0]
    plays = {
        row["game"]: row
        for row in db.execute("SELECT game, finished, score FROM plays WHERE player_id = ? AND play_date = ?", (player_id, date))
    }
    games = []
    for game_id, info in GAMES.items():
        row = plays.get(game_id)
        if row is None:
            status = "open"
        elif row["finished"]:
            status = "closed"
        else:
            status = "in_progress"
        games.append({"id": game_id, **info, "status": status, "score": row["score"] if row else 0})
    return {
        "id": player["id"],
        "name": player["name"],
        "avatar": player["avatar"],
        "date": date,
        "total_score": total,
        "today_score": sum(g["score"] for g in games),
        "games": games,
        "unplayed": [g["id"] for g in games if g["status"] != "closed"],
    }
