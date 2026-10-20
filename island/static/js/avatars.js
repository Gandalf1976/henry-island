/* Drawing helpers for islander avatars and snowmen (SVG markup strings).
   None of these functions take user supplied text, so the markup is safe. */
(function () {
  "use strict";

  const KINDS = {
    fox: { label: "Fox", head: "#f08a3c", muzzle: "#fff4e6", ears: "pointy", earInner: "#3b2a20", jumper: "#2f7d4f", hat: "#e63946" },
    cat: { label: "Cat", head: "#a7a9b4", muzzle: "#f1f1f4", ears: "pointy", earInner: "#f4b6c2", jumper: "#e63946", hat: "#2f7d4f", whiskers: true },
    bear: { label: "Bear", head: "#9b6338", muzzle: "#e9cba7", ears: "round", earInner: "#e9cba7", jumper: "#4361ee", hat: "#ffd34d" },
    bunny: { label: "Bunny", head: "#fbf6f0", muzzle: "#ffffff", ears: "long", earInner: "#f7a8b8", jumper: "#9d4edd", hat: null },
    penguin: { label: "Penguin", head: "#1d2433", muzzle: "#ffffff", ears: "none", beak: true, jumper: "#e63946", hat: "#4cc9f0" },
    frog: { label: "Frog", head: "#6cc04a", muzzle: "#c8eeb0", ears: "frog", jumper: "#f4a259", hat: "#e63946" },
    dog: { label: "Dog", head: "#d9a066", muzzle: "#f6e2c8", ears: "floppy", earInner: "#8a5a3b", jumper: "#e63946", hat: "#2f7d4f" },
    owl: { label: "Owl", head: "#8a6b4e", muzzle: "#e9d8c0", ears: "tufts", owlEyes: true, beak: true, jumper: "#2f7d4f", hat: null },
  };

  function ears(k) {
    switch (k.ears) {
      case "pointy":
        return `<polygon points="-19,-60 -14,-82 -4,-68" fill="${k.head}"/><polygon points="19,-60 14,-82 4,-68" fill="${k.head}"/>
                <polygon points="-15,-64 -13,-76 -8,-68" fill="${k.earInner}"/><polygon points="15,-64 13,-76 8,-68" fill="${k.earInner}"/>`;
      case "round":
        return `<circle cx="-15" cy="-68" r="8" fill="${k.head}"/><circle cx="15" cy="-68" r="8" fill="${k.head}"/>
                <circle cx="-15" cy="-68" r="4" fill="${k.earInner}"/><circle cx="15" cy="-68" r="4" fill="${k.earInner}"/>`;
      case "long":
        return `<ellipse cx="-9" cy="-86" rx="6" ry="20" fill="${k.head}"/><ellipse cx="9" cy="-86" rx="6" ry="20" fill="${k.head}"/>
                <ellipse cx="-9" cy="-86" rx="3" ry="14" fill="${k.earInner}"/><ellipse cx="9" cy="-86" rx="3" ry="14" fill="${k.earInner}"/>`;
      case "floppy":
        return `<ellipse cx="-20" cy="-52" rx="7" ry="14" fill="${k.earInner}" transform="rotate(15 -20 -52)"/>
                <ellipse cx="20" cy="-52" rx="7" ry="14" fill="${k.earInner}" transform="rotate(-15 20 -52)"/>`;
      case "frog":
        return `<circle cx="-11" cy="-68" r="9" fill="${k.head}"/><circle cx="11" cy="-68" r="9" fill="${k.head}"/>`;
      case "tufts":
        return `<polygon points="-18,-62 -18,-80 -8,-68" fill="${k.head}"/><polygon points="18,-62 18,-80 8,-68" fill="${k.head}"/>`;
      default:
        return "";
    }
  }

  function face(k) {
    let eyes;
    if (k.owlEyes) {
      eyes = `<circle cx="-8" cy="-54" r="7" fill="#fff"/><circle cx="8" cy="-54" r="7" fill="#fff"/>
              <circle cx="-8" cy="-54" r="3.5" fill="#222"/><circle cx="8" cy="-54" r="3.5" fill="#222"/>`;
    } else if (k.ears === "frog") {
      eyes = `<circle cx="-11" cy="-69" r="5" fill="#fff"/><circle cx="11" cy="-69" r="5" fill="#fff"/>
              <circle cx="-11" cy="-69" r="2.5" fill="#222"/><circle cx="11" cy="-69" r="2.5" fill="#222"/>`;
    } else {
      eyes = `<circle cx="-7" cy="-55" r="2.8" fill="#222"/><circle cx="7" cy="-55" r="2.8" fill="#222"/>
              <circle cx="-6" cy="-56" r="1" fill="#fff"/><circle cx="8" cy="-56" r="1" fill="#fff"/>`;
    }
    const muzzle = `<ellipse cx="0" cy="-46" rx="9" ry="6.5" fill="${k.muzzle}"/>`;
    const nose = k.beak
      ? `<polygon points="-4,-49 4,-49 0,-42" fill="#f4a259"/>`
      : (k.ears === "frog" ? `<path d="M-6,-46 Q0,-41 6,-46" stroke="#2d5a1e" stroke-width="2" fill="none"/>`
        : `<ellipse cx="0" cy="-48" rx="3" ry="2.2" fill="#3b2a20"/><path d="M-3,-44 Q0,-42 3,-44" stroke="#3b2a20" stroke-width="1.5" fill="none"/>`);
    const cheeks = `<circle cx="-13" cy="-47" r="3" fill="#ff8fab" opacity=".6"/><circle cx="13" cy="-47" r="3" fill="#ff8fab" opacity=".6"/>`;
    const whiskers = k.whiskers
      ? `<g stroke="#555" stroke-width="1"><line x1="-8" y1="-46" x2="-22" y2="-48"/><line x1="-8" y1="-44" x2="-22" y2="-42"/>
         <line x1="8" y1="-46" x2="22" y2="-48"/><line x1="8" y1="-44" x2="22" y2="-42"/></g>`
      : "";
    return eyes + muzzle + nose + cheeks + whiskers;
  }

  function hat(k) {
    if (!k.hat) {
      return `<path d="M-18,-64 Q0,-74 18,-64" stroke="#e63946" stroke-width="5" fill="none" stroke-linecap="round"/>`; // ear muff band
    }
    return `<path d="M-19,-62 Q-18,-84 0,-84 Q18,-84 19,-62Z" fill="${k.hat}"/>
            <rect x="-20" y="-66" width="40" height="7" rx="3" fill="#fff"/>
            <circle cx="0" cy="-86" r="6" fill="#fff"/>`;
  }

  /** Markup for an islander, feet at (0, 0), roughly 90 units tall. */
  function avatarSVG(kind) {
    const k = KINDS[kind] || KINDS.fox;
    return `<ellipse cx="0" cy="1" rx="18" ry="5" fill="#000" opacity=".18"/>
      <g class="legs"><rect x="-10" y="-14" width="8" height="14" rx="3" fill="#4a3426"/><rect x="2" y="-14" width="8" height="14" rx="3" fill="#4a3426"/></g>
      <path d="M-16,-12 Q-17,-36 0,-37 Q17,-36 16,-12Z" fill="${k.jumper}"/>
      <path d="M-12,-26 L12,-26" stroke="#fff" stroke-width="3" stroke-dasharray="3 3"/>
      <circle cx="-17" cy="-22" r="5" fill="${k.head}"/><circle cx="17" cy="-22" r="5" fill="${k.head}"/>
      ${ears(k)}
      <circle cx="0" cy="-54" r="20" fill="${k.head}"/>
      ${k.ears === "none" ? `<ellipse cx="0" cy="-50" rx="14" ry="13" fill="#fff"/>` : ""}
      ${face(k)}
      ${hat(k)}
      <path d="M-14,-36 Q0,-30 14,-36 L14,-31 Q0,-25 -14,-31Z" fill="#e63946"/>
      <rect x="6" y="-32" width="6" height="12" rx="2" fill="#e63946"/>`;
  }

  /** A standalone <svg> element string for menus. */
  function avatarIcon(kind, size) {
    size = size || 64;
    return `<svg viewBox="-30 -110 60 115" width="${size}" height="${size}" aria-hidden="true">${avatarSVG(kind)}</svg>`;
  }

  /** Snowman with its base at (0, 0); scale 1 is about 100 units tall. */
  function snowmanSVG(scale, place) {
    const hatColour = place === 1 ? "#ffd34d" : place === 2 ? "#c0c7d1" : place === 3 ? "#cd7f32" : "#222";
    return `<g transform="scale(${scale.toFixed(3)})">
      <ellipse cx="0" cy="2" rx="30" ry="7" fill="#000" opacity=".12"/>
      <circle cx="0" cy="-24" r="26" fill="#fff" stroke="#cfe3ef" stroke-width="2"/>
      <circle cx="0" cy="-64" r="18" fill="#fff" stroke="#cfe3ef" stroke-width="2"/>
      <circle cx="0" cy="-92" r="13" fill="#fff" stroke="#cfe3ef" stroke-width="2"/>
      <path d="M-16,-76 Q0,-68 16,-76 L16,-71 Q0,-63 -16,-71Z" fill="#e63946"/>
      <path d="M-18,-58 L-36,-72 M18,-58 L36,-74 M-30,-67 L-36,-62 M30,-68 L38,-64" stroke="#7a4b2a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="0" cy="-66" r="2.5" fill="#222"/><circle cx="0" cy="-56" r="2.5" fill="#222"/>
      <circle cx="-4.5" cy="-95" r="2" fill="#222"/><circle cx="4.5" cy="-95" r="2" fill="#222"/>
      <polygon points="0,-92 14,-89 0,-87" fill="#f4a259"/>
      <rect x="-11" y="-118" width="22" height="16" fill="${hatColour}"/>
      <rect x="-16" y="-104" width="32" height="4" rx="2" fill="${hatColour}"/>
    </g>`;
  }

  window.HIAvatars = { KINDS, avatarSVG, avatarIcon, snowmanSVG };
})();
