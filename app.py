"""Entry point for running Henry Island (used by Azure App Service / gunicorn)."""

import os

from island import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), debug=False)
