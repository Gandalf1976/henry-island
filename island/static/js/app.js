/* Core state, API helpers and the menus around the island. */
(function () {
  "use strict";

  const STORAGE_KEY = "henryIsland.playerId";
  const config = JSON.parse(document.getElementById("island-config").textContent);
  const $ = (id) => document.getElementById(id);

  const HI = {
    config,
    player: null, // status of the current islander (see /api/players/<id>)
    players: [], // leaderboard
    date: null,
    listeners: [],
  };
  window.HI = HI;

  HI.api = async function (method, url, body) {
    const options = { method, headers: { Accept: "application/json" } };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      return { ok: false, status: 0, data: { error: "Could not reach the island. Check your connection." } };
    }
    let data = {};
    try {
      data = await response.json();
    } catch (err) {
      data = { error: "Something went wrong." };
    }
    return { ok: response.ok, status: response.status, data };
  };

  HI.el = function (tag, attrs, text) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    });
    if (text !== undefined) node.textContent = text;
    return node;
  };

  HI.toast = function (message, ms) {
    const toast = $("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(HI.toast.timer);
    HI.toast.timer = setTimeout(() => { toast.hidden = true; }, ms || 3000);
  };

  HI.onChange = function (fn) { HI.listeners.push(fn); };

  HI.modalOpen = function () {
    return Array.from(document.querySelectorAll(".modal")).some((m) => !m.hidden);
  };

  HI.gameStatus = function (gameId) {
    if (!HI.player) return "open";
    const game = HI.player.games.find((g) => g.id === gameId);
    return game ? game.status : "open";
  };

  HI.refresh = async function () {
    const requests = [HI.api("GET", "/api/players")];
    if (HI.player) requests.push(HI.api("GET", `/api/players/${HI.player.id}`));
    const [board, me] = await Promise.all(requests);
    if (board.ok) {
      const dateChanged = HI.date && HI.date !== board.data.date;
      HI.players = board.data.players;
      HI.date = board.data.date;
      if (dateChanged) HI.toast("A new day has dawned on Henry Island! ☀️ All games are open again.", 5000);
    }
    if (me) {
      if (me.ok) {
        HI.player = me.data;
      } else if (me.status === 404) {
        HI.setPlayer(null);
        return;
      }
    }
    renderHud();
    if (HI.cardOpen()) HI.showCard();
    HI.listeners.forEach((fn) => fn());
  };

  HI.setPlayer = function (status) {
    HI.player = status;
    if (status) {
      localStorage.setItem(STORAGE_KEY, String(status.id));
      $("welcome").hidden = true;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      HI.hideCard();
      showWelcome();
    }
    renderHud();
    HI.listeners.forEach((fn) => fn());
  };

  function renderHud() {
    if (HI.date) {
      const date = new Date(HI.date + "T12:00:00");
      $("hud-date").textContent = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    }
    $("hud-player").hidden = !HI.player;
    if (HI.player) $("hud-player-name").textContent = HI.player.name;
  }

  /* ---------- Welcome / choose islander ---------- */

  let chosenAvatar = config.avatars[0];

  function buildAvatarChoices(container, selected, onPick) {
    container.replaceChildren();
    config.avatars.forEach((kind) => {
      const button = HI.el("button", { type: "button", class: "avatar-choice", "aria-pressed": String(kind === selected), title: HIAvatars.KINDS[kind].label });
      button.innerHTML = HIAvatars.avatarIcon(kind, 64); // static markup, no user data
      button.appendChild(HI.el("span", {}, HIAvatars.KINDS[kind].label));
      button.addEventListener("click", () => {
        container.querySelectorAll(".avatar-choice").forEach((b) => b.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        onPick(kind);
      });
      container.appendChild(button);
    });
  }

  async function showWelcome() {
    const board = await HI.api("GET", "/api/players");
    const players = board.ok ? board.data.players : [];
    const list = $("existing-players");
    list.replaceChildren();
    $("existing-players-section").hidden = players.length === 0;
    players.forEach((p) => {
      const button = HI.el("button", { type: "button", class: "player-choice" });
      button.innerHTML = HIAvatars.avatarIcon(p.avatar, 56);
      button.appendChild(HI.el("span", {}, p.name)); // textContent: safe for any name
      button.addEventListener("click", async () => {
        const res = await HI.api("GET", `/api/players/${p.id}`);
        if (res.ok) {
          HI.setPlayer(res.data);
          HI.refresh();
        }
      });
      list.appendChild(button);
    });
    buildAvatarChoices($("avatar-choices"), chosenAvatar, (kind) => { chosenAvatar = kind; });
    $("new-player-error").textContent = "";
    $("welcome").hidden = false;
  }

  $("new-player-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = $("new-player-name").value.trim();
    const res = await HI.api("POST", "/api/players", { name, avatar: chosenAvatar });
    if (!res.ok) {
      $("new-player-error").textContent = res.data.error || "Could not create your islander.";
      return;
    }
    $("new-player-name").value = "";
    HI.setPlayer(res.data);
    HI.toast(`Welcome to Henry Island, ${res.data.name}! 🎄`);
    HI.refresh();
  });

  $("switch-player").addEventListener("click", () => HI.setPlayer(null));

  /* ---------- Avatar card ---------- */

  HI.cardOpen = () => !$("avatar-card").hidden;

  HI.showCard = function (anchorRect) {
    if (!HI.player) return;
    const p = HI.player;
    $("card-name").textContent = p.name;
    $("card-total").textContent = p.total_score;
    $("card-today").textContent = p.today_score;
    const list = $("card-games");
    list.replaceChildren();
    const open = p.games.filter((g) => g.status !== "closed");
    if (open.length === 0) {
      list.appendChild(HI.el("li", { class: "muted" }, "You've played every game today! Come back tomorrow. 🎅"));
    }
    open.forEach((g) => {
      const item = HI.el("li");
      item.appendChild(HI.el("span", {}, g.name + (g.status === "in_progress" ? " (in progress)" : "")));
      const go = HI.el("button", { type: "button", class: "btn small" }, "Go");
      go.addEventListener("click", () => {
        HI.hideCard();
        if (HI.walkToGame) HI.walkToGame(g.id);
      });
      item.appendChild(go);
      list.appendChild(item);
    });
    const card = $("avatar-card");
    card.hidden = false;
    if (anchorRect) {
      const width = card.offsetWidth;
      const left = Math.min(window.innerWidth - width - 8, Math.max(8, anchorRect.left + anchorRect.width / 2 - width / 2));
      const top = Math.max(8, anchorRect.top - card.offsetHeight - 10);
      card.style.left = `${left}px`;
      card.style.top = `${top < 8 ? anchorRect.bottom + 10 : top}px`;
    }
  };

  HI.hideCard = function () { $("avatar-card").hidden = true; };

  $("card-change-avatar").addEventListener("click", () => {
    HI.hideCard();
    buildAvatarChoices($("avatar-picker-choices"), HI.player.avatar, async (kind) => {
      const res = await HI.api("PUT", `/api/players/${HI.player.id}`, { avatar: kind });
      if (res.ok) {
        HI.player = res.data;
        $("avatar-picker").hidden = true;
        HI.refresh();
      }
    });
    $("avatar-picker").hidden = false;
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => { $(button.dataset.close).hidden = true; });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      HI.hideCard();
      $("avatar-picker").hidden = true;
    }
  });

  /* ---------- Start up ---------- */

  async function start() {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY) || "", 10);
    if (saved) {
      const res = await HI.api("GET", `/api/players/${saved}`);
      if (res.ok) HI.player = res.data;
    }
    await HI.refresh();
    if (!HI.player) showWelcome();
    // Keep the scoreboard and the day fresh while people wander around.
    setInterval(() => { if (!HI.modalOpen()) HI.refresh(); }, 30000);
  }

  window.addEventListener("DOMContentLoaded", start);
})();
