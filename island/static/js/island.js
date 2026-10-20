/* The island itself: leaderboard, game signs, the islander, penguins and snow. */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("island");
  const ground = document.getElementById("island-ground");
  const lake = document.getElementById("lake-water");

  // Where each game's sign stands on the island.
  const SIGNS = {
    wordle: { x: 470, y: 450, theme: "#6aaa64" },
    lake: { x: 1110, y: 640, theme: "#4cc9f0" },
    quiz: { x: 585, y: 845, theme: "#e63946" },
  };
  const START = { x: 1000, y: 520 };
  const SPEED = 260; // island units per second
  const SIGN_REACH = 70;

  function svgEl(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------- Walkable area ---------- */

  function onIsland(x, y) {
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    let inside;
    if (ground.isPointInFill) {
      inside = ground.isPointInFill(point);
    } else {
      inside = ((x - 820) / 680) ** 2 + ((y - 570) / 430) ** 2 < 1;
    }
    if (!inside) return false;
    const cx = +lake.getAttribute("cx"), cy = +lake.getAttribute("cy");
    const rx = +lake.getAttribute("rx") + 10, ry = +lake.getAttribute("ry") + 10;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1;
  }

  /* ---------- Leaderboard: podium + snowmen ---------- */

  const board = document.getElementById("leaderboard");

  function snowmanScale(score, max) {
    return 0.45 + 0.5 * (max > 0 ? score / max : 0);
  }

  function drawSnowman(parent, x, y, player, max, place) {
    const scale = snowmanScale(player.total_score, max);
    const g = svgEl("g", { transform: `translate(${x} ${y})`, class: "snowman" });
    g.innerHTML = HIAvatars.snowmanSVG(scale, place); // static markup
    const fontSize = Math.max(13, 20 * scale);
    g.appendChild(svgEl("text", { x: 0, y: -24 * scale + fontSize * 0.35, "font-size": fontSize.toFixed(1), class: "snowman-score" }, String(player.total_score)));
    const title = svgEl("title", {}, `${player.name}: ${player.total_score} points (${player.today_score} today)`);
    g.appendChild(title);
    parent.appendChild(g);
    return g;
  }

  function namePlate(parent, x, y, text, highlight) {
    const g = svgEl("g", { transform: `translate(${x} ${y})`, class: "name-plate" + (highlight ? " mine" : "") });
    const label = svgEl("text", { x: 0, y: 5 }, text);
    g.appendChild(svgEl("rect", { x: -38, y: -11, width: 76, height: 22, rx: 8 }));
    g.appendChild(label);
    parent.appendChild(g);
    // Widen the plate to fit long names once the text is measured.
    try {
      const width = Math.max(60, label.getComputedTextLength() + 18);
      g.firstChild.setAttribute("x", -width / 2);
      g.firstChild.setAttribute("width", width);
    } catch (err) { /* not rendered yet */ }
  }

  function renderLeaderboard() {
    board.replaceChildren();
    const players = HI.players || [];
    const max = players.reduce((m, p) => Math.max(m, p.total_score), 0);
    const meId = HI.player && HI.player.id;

    board.appendChild(svgEl("text", { x: 800, y: 384, class: "board-title" }, "❄ Snowman Scoreboard ❄"));

    // Podium: 2nd | 1st | 3rd
    const podium = [
      { place: 2, x: 700, h: 38, colour: "#c0c7d1" },
      { place: 1, x: 800, h: 56, colour: "#ffd34d" },
      { place: 3, x: 900, h: 26, colour: "#cd7f32" },
    ];
    const base = 575;
    podium.forEach((step) => {
      const g = svgEl("g", { class: "podium-step" });
      g.appendChild(svgEl("rect", { x: step.x - 50, y: base - step.h, width: 100, height: step.h, fill: step.colour, stroke: "#fff", "stroke-width": 4, rx: 4 }));
      g.appendChild(svgEl("text", { x: step.x, y: base - step.h / 2 + 12, class: "podium-number" }, String(step.place)));
      board.appendChild(g);
      const player = players[step.place - 1];
      if (player) {
        drawSnowman(board, step.x, base - step.h, player, max, step.place);
        namePlate(board, step.x, base + 18, player.name, player.id === meId);
      }
    });
    if (players.length === 0) {
      board.appendChild(svgEl("text", { x: 800, y: 470, class: "board-empty" }, "No islanders yet!"));
    }

    // Every islander with their snowman, in rows across the middle of the plaza.
    const perRow = 7;
    const rows = Math.ceil(players.length / perRow);
    const rowGap = rows > 2 ? 58 : 72;
    players.forEach((player, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, players.length - row * perRow);
      const col = i % perRow;
      const x = 800 + (col - (inRow - 1) / 2) * 76;
      const y = 685 + row * rowGap;
      const s = drawSnowman(board, x, y, player, max, 0);
      s.setAttribute("transform", `translate(${x} ${y}) scale(${rows > 2 ? 0.5 : 0.6})`);
      namePlate(board, x, y + 14, `${player.name} ${player.total_score}`, player.id === meId);
    });
  }

  /* ---------- Game signs ---------- */

  const signs = document.getElementById("signs");

  function renderSigns() {
    signs.replaceChildren();
    Object.entries(SIGNS).forEach(([id, pos]) => {
      const game = HI.config.games[id];
      const status = HI.gameStatus(id);
      const g = svgEl("g", { transform: `translate(${pos.x} ${pos.y})`, class: `sign ${status}`, tabindex: 0, role: "button", "aria-label": `${game.name}${status === "closed" ? " (closed)" : ""}` });
      g.appendChild(svgEl("ellipse", { cx: 0, cy: 2, rx: 30, ry: 6, fill: "#000", opacity: ".15" }));
      g.appendChild(svgEl("rect", { x: -5, y: -60, width: 10, height: 62, fill: "#7a4b2a" }));
      g.appendChild(svgEl("rect", { x: -70, y: -96, width: 140, height: 44, rx: 8, fill: "#9b6338", stroke: pos.theme, "stroke-width": 5 }));
      g.appendChild(svgEl("path", { d: "M-70,-88 Q-60,-102 -30,-96 Q0,-104 30,-96 Q60,-102 70,-88 L70,-92 Q70,-96 66,-96 L-66,-96 Q-70,-96 -70,-92Z", fill: "#fff" }));
      g.appendChild(svgEl("text", { x: 0, y: -67, class: "sign-text" }, game.name));
      if (status === "closed") {
        const closed = svgEl("g", { transform: "translate(0 -30) rotate(-8)", class: "closed-sign" });
        closed.appendChild(svgEl("line", { x1: -30, y1: -30, x2: -20, y2: -14, stroke: "#5c321b", "stroke-width": 2 }));
        closed.appendChild(svgEl("line", { x1: 30, y1: -30, x2: 20, y2: -14, stroke: "#5c321b", "stroke-width": 2 }));
        closed.appendChild(svgEl("rect", { x: -48, y: -14, width: 96, height: 30, rx: 5, fill: "#c1121f", stroke: "#fff", "stroke-width": 3 }));
        closed.appendChild(svgEl("text", { x: 0, y: 8, class: "closed-text" }, "CLOSED"));
        g.appendChild(closed);
      } else if (status === "in_progress") {
        g.appendChild(svgEl("text", { x: 0, y: -104, class: "sign-badge" }, "▶ in progress"));
      }
      g.addEventListener("click", (event) => { event.stopPropagation(); walkToGame(id); });
      g.addEventListener("keydown", (event) => { if (event.key === "Enter") walkToGame(id); });
      signs.appendChild(g);
    });
  }

  /* ---------- The islander ---------- */

  const layer = document.getElementById("player-layer");
  const me = { x: START.x, y: START.y, target: null, arriveGame: null, facing: 1, node: null, kind: null, keys: new Set() };

  function renderAvatar() {
    if (!HI.player) {
      layer.replaceChildren();
      me.node = null;
      return;
    }
    if (!me.node || me.kind !== HI.player.avatar) {
      layer.replaceChildren();
      me.kind = HI.player.avatar;
      me.node = svgEl("g", { class: "me", tabindex: 0, role: "button", "aria-label": "Your avatar: show your games and score" });
      const body = svgEl("g", { class: "body" });
      body.innerHTML = HIAvatars.avatarSVG(me.kind); // static markup
      me.node.appendChild(body);
      me.label = svgEl("text", { x: 0, y: -100, class: "me-label" });
      me.node.appendChild(me.label);
      me.prompt = svgEl("text", { x: 0, y: 24, class: "me-prompt" });
      me.node.appendChild(me.prompt);
      me.node.addEventListener("click", (event) => {
        event.stopPropagation();
        HI.cardOpen() ? HI.hideCard() : HI.showCard(me.node.getBoundingClientRect());
      });
      me.node.addEventListener("keydown", (event) => {
        if (event.key === "Enter") HI.showCard(me.node.getBoundingClientRect());
      });
      layer.appendChild(me.node);
    }
    me.label.textContent = HI.player.name;
    placeAvatar();
  }

  function placeAvatar() {
    if (!me.node) return;
    me.node.setAttribute("transform", `translate(${me.x.toFixed(1)} ${me.y.toFixed(1)})`);
    me.node.firstChild.setAttribute("transform", `scale(${me.facing} 1)`);
    const near = nearestSign();
    me.prompt.textContent = near ? `Press Enter to visit ${HI.config.games[near].name}` : "";
  }

  function nearestSign() {
    let best = null;
    Object.entries(SIGNS).forEach(([id, pos]) => {
      if (Math.hypot(pos.x - me.x, pos.y - me.y) < SIGN_REACH) best = id;
    });
    return best;
  }

  function walkToGame(id) {
    if (!HI.player) return;
    const pos = SIGNS[id];
    if (Math.hypot(pos.x - me.x, pos.y - me.y) < SIGN_REACH) {
      HI.openGame(id);
      return;
    }
    me.target = { x: pos.x, y: pos.y + 30 };
    me.arriveGame = id;
  }
  HI.walkToGame = walkToGame;

  function toIsland(event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  svg.addEventListener("click", (event) => {
    if (!HI.player || HI.modalOpen()) return;
    HI.hideCard();
    const p = toIsland(event);
    if (onIsland(p.x, p.y)) {
      me.target = { x: p.x, y: p.y };
      me.arriveGame = null;
    }
  });

  const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };

  document.addEventListener("keydown", (event) => {
    if (!HI.player || HI.modalOpen() || /input|textarea/i.test(event.target.tagName)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (KEYS[key]) {
      me.keys.add(key);
      me.target = null;
      event.preventDefault();
    } else if (event.key === "Enter" && !event.target.closest(".sign, .me, button")) {
      const near = nearestSign();
      if (near) HI.openGame(near);
    }
  });
  document.addEventListener("keyup", (event) => {
    me.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener("blur", () => me.keys.clear());

  function step(dt) {
    if (!me.node || HI.modalOpen()) return;
    let dx = 0, dy = 0;
    me.keys.forEach((key) => { dx += KEYS[key][0]; dy += KEYS[key][1]; });
    if (me.target && !dx && !dy) {
      const tx = me.target.x - me.x, ty = me.target.y - me.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 4) {
        me.target = null;
        if (me.arriveGame) {
          const id = me.arriveGame;
          me.arriveGame = null;
          HI.openGame(id);
        }
      } else {
        dx = tx / dist;
        dy = ty / dist;
      }
    }
    if (!dx && !dy) {
      me.node.classList.remove("walking");
      return;
    }
    const len = Math.hypot(dx, dy);
    const nx = me.x + (dx / len) * SPEED * dt;
    const ny = me.y + (dy / len) * SPEED * dt;
    let moved = false;
    if (onIsland(nx, ny)) { me.x = nx; me.y = ny; moved = true; }
    else if (onIsland(nx, me.y)) { me.x = nx; moved = true; }
    else if (onIsland(me.x, ny)) { me.y = ny; moved = true; }
    if (!moved && me.target) { me.target = null; me.arriveGame = null; }
    if (dx) me.facing = dx < 0 ? -1 : 1;
    me.node.classList.toggle("walking", moved);
    placeAvatar();
  }

  /* ---------- Wandering penguins ---------- */

  const npcLayer = document.getElementById("npcs");
  const penguins = [];

  function randomSpot() {
    for (let i = 0; i < 50; i++) {
      const x = 220 + Math.random() * 1200, y = 200 + Math.random() * 760;
      if (onIsland(x, y)) return { x, y };
    }
    return { x: 800, y: 900 };
  }

  function addPenguins(count) {
    for (let i = 0; i < count; i++) {
      const spot = randomSpot();
      const node = svgEl("g", { class: "penguin" });
      const inner = svgEl("g", { class: "waddle" });
      inner.appendChild(svgEl("use", { href: "#penguin" }));
      node.appendChild(inner);
      npcLayer.appendChild(node);
      penguins.push({ ...spot, target: randomSpot(), wait: Math.random() * 3, node, inner, speed: 35 + Math.random() * 25 });
    }
  }

  function movePenguins(dt) {
    penguins.forEach((p) => {
      if (p.wait > 0) {
        p.wait -= dt;
        p.inner.classList.remove("walking");
      } else {
        const tx = p.target.x - p.x, ty = p.target.y - p.y;
        const dist = Math.hypot(tx, ty);
        const nx = p.x + (tx / dist) * p.speed * dt, ny = p.y + (ty / dist) * p.speed * dt;
        if (dist < 3 || !onIsland(nx, ny)) {
          p.target = randomSpot();
          p.wait = 1 + Math.random() * 4;
        } else {
          p.x = nx;
          p.y = ny;
          p.facing = tx < 0 ? -1 : 1;
          p.inner.classList.add("walking");
        }
      }
      p.node.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.facing || 1} 1)`);
    });
  }

  /* ---------- Snow that falls at random times ---------- */

  const canvas = document.getElementById("snow");
  const ctx = canvas.getContext("2d");
  const flakes = [];
  const snow = { intensity: 0, target: 0, nextChange: 0 };

  function resizeCanvas() {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  }
  window.addEventListener("resize", resizeCanvas);

  function updateSnow(dt, now) {
    if (now > snow.nextChange) {
      // Light snow comes and goes: snow for a while, then a clear spell.
      const snowing = Math.random() < 0.6;
      snow.target = snowing ? 0.3 + Math.random() * 0.7 : 0;
      snow.nextChange = now + (snowing ? 20000 + Math.random() * 40000 : 10000 + Math.random() * 30000);
    }
    snow.intensity += (snow.target - snow.intensity) * Math.min(1, dt * 0.5);
    const w = canvas.width, h = canvas.height;
    const wanted = Math.round(snow.intensity * 140);
    while (flakes.length < wanted) {
      flakes.push({ x: Math.random() * w, y: -10 - Math.random() * h * 0.3, r: 1 + Math.random() * 2.5, vy: 25 + Math.random() * 45, sway: Math.random() * Math.PI * 2 });
    }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const scale = window.devicePixelRatio || 1;
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.y += f.vy * dt * scale;
      f.sway += dt;
      f.x += Math.sin(f.sway) * 12 * dt * scale;
      if (f.y > h + 5) {
        if (flakes.length > wanted) { flakes.splice(i, 1); continue; }
        f.y = -5;
        f.x = Math.random() * w;
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- Main loop ---------- */

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    movePenguins(dt);
    updateSnow(dt, now);
    requestAnimationFrame(frame);
  }

  HI.onChange(() => {
    renderLeaderboard();
    renderSigns();
    renderAvatar();
  });

  window.addEventListener("DOMContentLoaded", () => {
    resizeCanvas();
    addPenguins(5);
    snow.target = 0.5; // start with a gentle flurry
    snow.nextChange = performance.now() + 25000;
    requestAnimationFrame(frame);
  });
})();
