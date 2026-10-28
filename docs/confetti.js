(() => {
  "use strict";

  // Realistic confetti: quadratic air resistance (a = g - k * v * |v|),
  // semi-implicit Euler with real frame time, pieces spawned across the
  // full width of the completed task row.
  const COLORS = ["#6c5ce7", "#00b894", "#fdcb6e", "#e17055", "#74b9ff", "#a29bfe", "#ff7675"];
  const GRAVITY = 1300;
  const DRAG_COEFFICIENT = 0.009;
  const SIZE_PX = 8;
  const LAUNCH_VY_MIN = -700;
  const LAUNCH_VY_MAX = -1150;
  const LAUNCH_VX = 60;
  const SPIN_MAX_DEG_S = 900;
  const FADE_START = 0.75;
  const LIFETIME_MS = 2200;
  const MAX_DT_S = 0.05;

  let layer = null;

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.className = "confetti-layer";
    document.body.appendChild(layer);
    return layer;
  }

  function spawnPiece(parent, origin, spreadFraction) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.backgroundColor = COLORS[(Math.random() * COLORS.length) | 0];
    piece.style.width = SIZE_PX + "px";
    piece.style.height = (SIZE_PX * (0.4 + Math.random() * 0.8)) + "px";
    const state = {
      el: piece,
      x: origin.x + spreadFraction * origin.width,
      y: origin.y + (Math.random() - 0.5) * origin.height,
      vx: (Math.random() - 0.5) * 2 * LAUNCH_VX,
      vy: LAUNCH_VY_MIN - Math.random() * (LAUNCH_VY_MAX - LAUNCH_VY_MIN),
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 2 * SPIN_MAX_DEG_S,
      born: performance.now(),
    };
    parent.appendChild(piece);
    return state;
  }

  function paint(state, progress) {
    state.el.style.transform =
      `translate(${state.x}px, ${state.y}px) rotate(${state.rot}deg)`;
    state.el.style.opacity = progress > FADE_START
      ? String(1 - (progress - FADE_START) / (1 - FADE_START))
      : "1";
  }

  function step(states, dt, now) {
    let alive = false;
    for (const s of states) {
      if (!s) continue;
      const speed = Math.hypot(s.vx, s.vy);
      const drag = DRAG_COEFFICIENT * speed;
      s.vx -= s.vx * drag * dt;
      s.vy += (GRAVITY - s.vy * drag) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      const progress = (now - s.born) / LIFETIME_MS;
      if (progress >= 1) {
        s.el.remove();
      } else {
        alive = true;
        paint(s, progress);
      }
    }
    return alive;
  }

  function burstAt(origin, count) {
    if (
      !origin ||
      !Number.isFinite(origin.x) ||
      !Number.isFinite(origin.y) ||
      count <= 0
    ) {
      return;
    }
    const parent = ensureLayer();
    const states = [];
    for (let i = 0; i < count; i++) {
      const spreadFraction = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      states.push(spawnPiece(parent, origin, spreadFraction));
    }

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(MAX_DT_S, (now - last) / 1000);
      last = now;
      if (!step(states, dt, now)) return;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function originOf(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
  }

  function burst(originEl, count) {
    burstAt(originOf(originEl), count);
  }

  window.Confetti = { burst, burstAt, originOf };
})();
