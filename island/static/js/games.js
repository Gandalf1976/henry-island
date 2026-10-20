/* The three mini games, shown in a pop-up over the island. */
(function () {
  "use strict";

  const modal = document.getElementById("game-modal");
  const box = document.getElementById("game-box");
  const content = document.getElementById("game-content");
  const el = HI.el;
  let current = null; // { id, cleanup(), onKey(event), timed, finished }

  function playerBody(extra) {
    return Object.assign({ player_id: HI.player.id }, extra || {});
  }

  HI.openGame = async function (id) {
    if (!HI.player || current) return;
    HI.hideCard();
    if (HI.gameStatus(id) === "closed") {
      HI.toast(`${HI.config.games[id].name} is closed for you today. Come back tomorrow! 🎅`);
      return;
    }
    const res = await HI.api("POST", `/api/games/${id}/start`, playerBody());
    if (!res.ok) {
      HI.toast(res.data.error || "Could not start the game.");
      return;
    }
    if (res.data.state.finished) {
      HI.toast(`${HI.config.games[id].name} is closed for you today. Come back tomorrow! 🎅`);
      HI.refresh();
      return;
    }
    content.replaceChildren();
    box.className = `modal-box game-box theme-${id}`;
    modal.hidden = false;
    current = { id, cleanups: [], finished: false, timed: id !== "wordle" };
    ({ wordle: wordleGame, lake: lakeGame, quiz: quizGame })[id](res.data.state);
    HI.refresh();
  };

  function closeGame() {
    if (!current) return;
    if (current.timed && !current.finished &&
        !window.confirm("The clock keeps ticking while you're away and you can only play once today. Leave the game?")) {
      return;
    }
    current.cleanups.forEach((fn) => fn());
    current = null;
    modal.hidden = true;
    HI.refresh();
  }

  document.getElementById("game-close").addEventListener("click", closeGame);
  document.addEventListener("keydown", (event) => {
    if (!current || modal.hidden) return;
    if (event.key === "Escape") { closeGame(); return; }
    if (current.onKey && !event.ctrlKey && !event.metaKey && !event.altKey) current.onKey(event);
  });

  function header(title, subtitle) {
    const head = el("header", { class: "game-header" });
    head.appendChild(el("h2", {}, title));
    if (subtitle) head.appendChild(el("p", { class: "muted" }, subtitle));
    content.appendChild(head);
    return head;
  }

  function message() {
    const node = el("p", { class: "game-message", role: "status", "aria-live": "polite" });
    content.appendChild(node);
    return node;
  }

  function finishPanel(lines, score) {
    const panel = el("div", { class: "finish-panel" });
    panel.appendChild(el("p", { class: "finish-score" }, `⛄ You scored ${score} point${score === 1 ? "" : "s"}!`));
    lines.forEach((line) => panel.appendChild(el("p", {}, line)));
    const back = el("button", { type: "button", class: "btn" }, "Back to the island");
    back.addEventListener("click", closeGame);
    panel.appendChild(back);
    content.appendChild(panel);
    current.finished = true;
    current.onKey = null;
    back.focus();
    HI.refresh();
  }

  /* Countdown shown in timed games. Server time is the real referee. */
  function countdown(seconds, limit, onTick, onDone) {
    const ends = performance.now() + seconds * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, (ends - performance.now()) / 1000);
      onTick(left, limit);
      if (left <= 0) {
        clearInterval(timer);
        onDone();
      }
    }, 100);
    onTick(seconds, limit);
    current.cleanups.push(() => clearInterval(timer));
    return () => clearInterval(timer);
  }

  function timerBar() {
    const wrap = el("div", { class: "timer" });
    const bar = el("div", { class: "timer-bar" });
    const label = el("span", { class: "timer-label" });
    wrap.appendChild(bar);
    wrap.appendChild(label);
    content.appendChild(wrap);
    return (left, limit) => {
      bar.style.width = `${(100 * left) / limit}%`;
      bar.classList.toggle("low", left < 10);
      label.textContent = `${Math.ceil(left)}s`;
    };
  }

  /* ---------------- Henry-Wordle ---------------- */

  function wordleGame(state) {
    header("Henry-Wordle", "Guess the secret five letter word. 10 points for the first try, then 5, 4, 3, 2, 1.");
    const msg = message();
    const grid = el("div", { class: "wordle-grid" });
    const rows = [];
    for (let r = 0; r < state.max_attempts; r++) {
      const row = el("div", { class: "wordle-row" });
      const tiles = [];
      for (let c = 0; c < state.word_length; c++) {
        const tile = el("div", { class: "tile" });
        row.appendChild(tile);
        tiles.push(tile);
      }
      grid.appendChild(row);
      rows.push({ row, tiles });
    }
    content.appendChild(grid);

    const keyboard = el("div", { class: "keyboard" });
    const keyButtons = {};
    ["qwertyuiop", "asdfghjkl", ">zxcvbnm<"].forEach((letters) => {
      const row = el("div", { class: "kb-row" });
      letters.split("").forEach((ch) => {
        const label = ch === ">" ? "Enter" : ch === "<" ? "⌫" : ch.toUpperCase();
        const key = el("button", { type: "button", class: "key" + (ch === ">" || ch === "<" ? " wide" : "") }, label);
        key.addEventListener("click", () => press(ch === ">" ? "Enter" : ch === "<" ? "Backspace" : ch));
        if (ch !== ">" && ch !== "<") keyButtons[ch] = key;
        row.appendChild(key);
      });
      keyboard.appendChild(row);
    });
    content.appendChild(keyboard);

    let typed = "";
    let busy = false;
    const rank = { absent: 1, present: 2, correct: 3 };

    function draw() {
      const keyState = {};
      rows.forEach(({ tiles }, r) => {
        const guess = state.guesses[r];
        tiles.forEach((tile, c) => {
          tile.className = "tile";
          tile.textContent = "";
          if (guess) {
            tile.textContent = guess.word[c].toUpperCase();
            tile.classList.add(guess.result[c]);
            const prev = keyState[guess.word[c]];
            if (!prev || rank[guess.result[c]] > rank[prev]) keyState[guess.word[c]] = guess.result[c];
          } else if (r === state.guesses.length && typed[c]) {
            tile.textContent = typed[c].toUpperCase();
            tile.classList.add("filled");
          }
        });
      });
      Object.entries(keyButtons).forEach(([ch, key]) => {
        key.className = "key" + (keyState[ch] ? ` ${keyState[ch]}` : "");
      });
    }

    async function press(key) {
      if (state.finished || busy) return;
      msg.textContent = "";
      if (key === "Backspace") {
        typed = typed.slice(0, -1);
      } else if (key === "Enter") {
        if (typed.length !== state.word_length) {
          shake("Not enough letters");
          return;
        }
        busy = true;
        const res = await HI.api("POST", "/api/games/wordle/guess", playerBody({ guess: typed }));
        busy = false;
        if (!current) return;
        if (res.data.state) state = res.data.state;
        if (!res.ok) {
          shake(res.data.error || "Try again");
          return;
        }
        typed = "";
        draw();
        if (state.finished) {
          finishPanel([state.won ? "Brilliant! You found the word." : `The word was ${state.answer.toUpperCase()}.`], state.score);
        } else {
          msg.textContent = `${state.attempts_left} guess${state.attempts_left === 1 ? "" : "es"} left`;
        }
        return;
      } else if (/^[a-z]$/.test(key) && typed.length < state.word_length) {
        typed += key;
      }
      draw();
    }

    function shake(text) {
      msg.textContent = text;
      const row = rows[state.guesses.length];
      if (!row) return;
      row.row.classList.remove("shake");
      void row.row.offsetWidth;
      row.row.classList.add("shake");
    }

    current.onKey = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === "Enter" || key === "Backspace" || /^[a-z]$/.test(key)) {
        event.preventDefault();
        press(key);
      }
    };
    draw();
    msg.textContent = `${state.attempts_left} guess${state.attempts_left === 1 ? "" : "es"} left`;
  }

  /* ---------------- Henry-Lake ---------------- */

  function lakeGame(state) {
    header("Henry-Lake", "Make words of 3+ letters from the tiles. 1 point each, +5 bonus for the 9 letter word!");
    const tick = timerBar();
    const scoreLine = el("p", { class: "lake-score" });
    content.appendChild(scoreLine);
    const water = el("div", { class: "lake-water" });
    const pads = el("div", { class: "lily-pads" });
    water.appendChild(pads);
    const tilesRow = el("div", { class: "lake-tiles" });
    water.appendChild(tilesRow);
    content.appendChild(water);
    const wordLine = el("div", { class: "lake-word", "aria-live": "polite" });
    content.appendChild(wordLine);
    const msg = message();
    const buttons = el("div", { class: "lake-buttons" });
    const actions = {};
    [["shuffle", "🔀 Shuffle"], ["clear", "Clear"], ["submit", "Add word ✓"], ["finish", "I'm done"]].forEach(([id, label]) => {
      const b = el("button", { type: "button", class: "btn small" + (id === "submit" ? " primary" : "") }, label);
      b.addEventListener("click", () => actions[id]());
      buttons.appendChild(b);
      actions[id + "Button"] = b;
    });
    content.appendChild(buttons);

    let order = state.letters.map((_, i) => i);
    let picked = []; // indexes into state.letters
    let busy = false;
    const placed = new Set();

    function padPosition(word) {
      // Spread the lily pads around the lake using a hash of the word.
      let h = 0;
      for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      for (let tries = 0; tries < 12; tries++) {
        const x = 4 + ((h >>> (tries % 8)) % 84);
        const y = 4 + (((h * 7 + tries * 13) >>> 3) % 52);
        const key = `${Math.round(x / 14)}-${Math.round(y / 14)}`;
        if (!placed.has(key) || tries === 11) {
          placed.add(key);
          return { x, y };
        }
        h = (h * 1103515245 + 12345) >>> 0;
      }
      return { x: 40, y: 30 };
    }

    function addPad(word, isNew) {
      const pos = padPosition(word);
      const pad = el("div", { class: "lily-pad" + (word.length === state.letters.length ? " golden" : "") + (isNew ? " new" : "") }, word);
      pad.style.left = `${pos.x}%`;
      pad.style.top = `${pos.y}%`;
      pads.appendChild(pad);
    }

    function draw() {
      tilesRow.replaceChildren();
      order.forEach((i) => {
        const tile = el("button", { type: "button", class: "lake-tile" + (picked.includes(i) ? " used" : "") }, state.letters[i].toUpperCase());
        tile.style.animationDelay = `${(i * 0.37) % 2}s`;
        tile.disabled = picked.includes(i) || state.finished;
        tile.addEventListener("click", () => { picked.push(i); draw(); });
        tilesRow.appendChild(tile);
      });
      wordLine.textContent = picked.map((i) => state.letters[i].toUpperCase()).join("") || "\u00a0";
      scoreLine.textContent = `Score: ${state.score} · Words: ${state.words.length}`;
    }

    actions.shuffle = () => {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      draw();
    };
    actions.clear = () => { picked = []; draw(); };
    actions.submit = async () => {
      if (busy || state.finished || picked.length === 0) return;
      const word = picked.map((i) => state.letters[i]).join("");
      picked = [];
      busy = true;
      const res = await HI.api("POST", "/api/games/lake/word", playerBody({ word }));
      busy = false;
      if (!current) return;
      if (res.data.state) state = res.data.state;
      if (res.ok) {
        msg.textContent = res.data.points > 1 ? `🎉 ${word.toUpperCase()} - the big one! +${res.data.points}` : `${word.toUpperCase()} +1`;
        addPad(word, true);
      } else {
        msg.textContent = res.data.error || "Try another word.";
      }
      draw();
      if (state.finished) done();
    };
    actions.finish = async () => {
      if (state.finished) return;
      const res = await HI.api("POST", "/api/games/lake/finish", playerBody());
      if (res.data.state) state = res.data.state;
      done();
    };

    function done() {
      if (current.finished) return;
      stop();
      state.finished = true;
      draw();
      buttons.remove();
      const lines = [`You found ${state.words.length} word${state.words.length === 1 ? "" : "s"}.`];
      if (state.answer) lines.push(`The nine letter word was ${state.answer.toUpperCase()}${state.found_target ? " - and you found it! ⭐" : "."}`);
      finishPanel(lines, state.score);
    }

    current.onKey = (event) => {
      const key = event.key;
      if (key === "Enter") { event.preventDefault(); actions.submit(); }
      else if (key === "Backspace") { event.preventDefault(); picked.pop(); draw(); }
      else if (/^[a-zA-Z]$/.test(key)) {
        const free = order.find((i) => state.letters[i] === key.toLowerCase() && !picked.includes(i));
        if (free !== undefined) { picked.push(free); draw(); }
      }
    };

    state.words.forEach((w) => addPad(w, false));
    draw();
    const stop = countdown(state.time_left, state.time_limit, tick, actions.finish);
  }

  /* ---------------- Henry-Quiz ---------------- */

  function quizGame(state) {
    header("Henry-Quiz", "10 questions, 60 seconds. 1 point for every right answer!");
    const tick = timerBar();
    const info = el("div", { class: "quiz-info" });
    content.appendChild(info);
    const card = el("div", { class: "quiz-card" });
    content.appendChild(card);
    let busy = false;

    function draw() {
      info.textContent = `Question ${Math.min(state.current + 1, state.questions.length)} of ${state.questions.length} · Score: ${state.score}`;
      card.replaceChildren();
      const q = state.questions[state.current];
      if (!q) return;
      card.appendChild(el("span", { class: "quiz-category" }, q.category));
      card.appendChild(el("h3", { class: "quiz-question" }, q.question));
      const options = el("div", { class: "quiz-options" });
      q.options.forEach((text, i) => {
        const b = el("button", { type: "button", class: "quiz-option" }, text);
        b.addEventListener("click", () => choose(i, options));
        options.appendChild(b);
      });
      card.appendChild(options);
    }

    async function choose(choice, options) {
      if (busy || state.finished) return;
      busy = true;
      const index = state.current;
      const res = await HI.api("POST", "/api/games/quiz/answer", playerBody({ question: index, choice }));
      if (!current) return;
      if (res.data.state) state = res.data.state;
      const answered = state.questions[index];
      if (answered && answered.answer !== undefined) {
        Array.from(options.children).forEach((b, i) => {
          b.disabled = true;
          if (i === answered.answer) b.classList.add("right");
          else if (i === choice) b.classList.add("wrong");
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      busy = false;
      if (!current) return;
      if (state.finished) done();
      else draw();
    }

    async function finish() {
      if (state.finished) return;
      const res = await HI.api("POST", "/api/games/quiz/finish", playerBody());
      if (res.data.state) state = res.data.state;
      done();
    }

    function done() {
      if (current.finished) return;
      stop();
      state.finished = true;
      card.replaceChildren();
      const answered = state.questions.filter((q) => q.chosen !== null && q.chosen !== undefined).length;
      info.textContent = `You answered ${answered} of ${state.questions.length} questions.`;
      finishPanel([`${state.score} correct answer${state.score === 1 ? "" : "s"}.`], state.score);
    }

    current.onKey = (event) => {
      const n = parseInt(event.key, 10);
      const buttons = card.querySelectorAll(".quiz-option");
      if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
    };

    draw();
    const stop = countdown(state.time_left, state.time_limit, tick, finish);
  }
})();
