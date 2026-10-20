# henry-island
Henry Island where magical things happen ❄️🎄

A snowy, Animal-Crossing-style Christmas island where the family can wander about
and play three daily mini games. Santa, his sleigh and reindeer, penguins, candy
canes, log cabins and the odd snow flurry included.

## How it works

* **Choose an islander** – pick (or create) your name and one of 8 avatars.
  The choice is remembered in the browser.
* **Wander around** – walk with the arrow keys / WASD or tap/click the snow.
* **Click your avatar** to see the games you haven't played today and your total score.
* **Click a game sign** to walk over and play. Each game can be played **once per
  day**; afterwards its sign shows **CLOSED** until tomorrow.
* **Snowman Scoreboard** – the plaza in the middle shows every islander with a
  snowman sized by their accumulated score, plus a podium for 1st, 2nd and 3rd.

### The games

| Game | Rules | Scoring |
| --- | --- | --- |
| **Henry-Wordle** | Guess the daily 5 letter word in 6 tries. Green = right letter, right spot; yellow = right letter, wrong spot; grey = not in the word. | 1st try 10, 2nd 5, 3rd 4, 4th 3, 5th 2, 6th 1 |
| **Henry-Lake** | A daily 9 letter word is scrambled into tiles on the lake. Make as many words (3+ letters) as you can in 120 seconds. Found words appear on lily pads. | 1 point per word, +5 bonus for the 9 letter word |
| **Henry-Quiz** | 10 daily multiple choice questions for teenagers (Geography, Science and Nature, Entertainment, Sport, General Knowledge, Music) in 60 seconds. | 1 point per correct answer |

Everyone gets the same puzzles each day. The daily word is chosen with Python's
`random.choice()` using a generator seeded by the date. All checking, scoring and
timing happens on the server, so answers are never sent to the browser early.

### Project layout

```
app.py                     # entry point (gunicorn app:app)
island/__init__.py         # Flask app + JSON API
island/wordle.py           # Henry-Wordle rules (python -m island.wordle plays it in a terminal)
island/lake.py             # Henry-Lake rules
island/quiz.py             # Henry-Quiz rules
island/data/answers.txt    # possible Wordle answers
island/data/guesses.txt    # acceptable Wordle guesses
island/data/lake_words.txt # 9 letter words for Henry-Lake
island/data/dictionary.txt # words accepted in Henry-Lake
island/data/quiz_questions.json
island/templates, island/static  # the island front end
tests/                     # pytest tests
```

To add quiz questions, append entries to `island/data/quiz_questions.json`
(`category`, `question`, `answer` and three `wrong` answers). Word lists are one
word per line.

## Running locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python app.py            # http://localhost:8000
python -m pytest         # run the tests
```

## Settings (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `ISLAND_TIMEZONE` | `Europe/London` | When "today" starts and ends (any IANA timezone, e.g. `Australia/Sydney`). |
| `ISLAND_SECRET` | *(empty)* | Mixed into the daily random seed so nobody can work out tomorrow's word from the code. Set it to any long random string. |
| `ISLAND_DATABASE` | `instance/henry-island.db` locally, `/home/data/henry-island.db` on Azure App Service | SQLite database file. |

## Deploying to Azure App Service

The site is a small Python (Flask) app with a SQLite database, which fits on the
Free (F1) or Basic (B1) Linux App Service plan.

1. Install the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) and run `az login`.
2. From the repository folder, create and deploy the web app:

   ```bash
   az webapp up --runtime PYTHON:3.12 --sku B1 --name henry-island --resource-group henry-island-rg
   ```

   (`--name` must be unique across Azure; it becomes `https://<name>.azurewebsites.net`.)
3. Set the startup command and settings:

   ```bash
   az webapp config set --name henry-island --resource-group henry-island-rg \
     --startup-file "gunicorn --bind=0.0.0.0 --timeout 600 app:app"
   az webapp config appsettings set --name henry-island --resource-group henry-island-rg \
     --settings ISLAND_SECRET="<a long random string>" ISLAND_TIMEZONE="Europe/London"
   ```
4. Re-run `az webapp up` whenever you change the code.

The database lives in `/home/data`, which App Service keeps between restarts and
deployments. There are no passwords – anyone with the link can visit, so only
share it with the family.

## Credits

The word lists are derived from SCOWL – see `island/data/WORDLIST-LICENSE.txt`.
