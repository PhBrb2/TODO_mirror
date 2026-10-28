(() => {
  "use strict";

  // Reward flight: coins/gems pop in at the completed task, scatter slightly
  // outwards so the stack is visible, then get pulled to the balance
  // indicator like a magnet. The destination is clamped into the visible
  // viewport and below the top edge of the scrolling task list, because the
  // header balance can be scrolled out of view.
  const POP_IN_MS = 200;
  const SCATTER_MS = 350;
  const SCATTER_SPEED = 90;
  const MAGNET_ACCEL = 9000;
  const MAGNET_MAX_SPEED = 2600;
  const MAX_DT_S = 0.05;
  const COIN_DIVISOR = 3;
  const MAX_SIMULTANEOUS = 8;

  let layer = null;

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.className = "reward-flight-layer";
    document.body.appendChild(layer);
    return layer;
  }

  function centerOf(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function clampToScrollArea(point, boundaryEl) {
    const margin = 16;
    const clamped = {
      x: Math.min(window.innerWidth - margin, Math.max(margin, point.x)),
      y: Math.min(window.innerHeight - margin, Math.max(margin, point.y)),
    };
    if (boundaryEl) {
      const top = boundaryEl.getBoundingClientRect().top;
      clamped.y = Math.max(clamped.y, top + margin);
    }
    return clamped;
  }

  function paint(state, scale) {
    state.el.style.transform =
      `translate(${state.x}px, ${state.y}px) translate(-50%, -50%) scale(${scale})`;
  }

  function spawnFlyer(parent, emoji, from, to, angle) {
    const flyer = document.createElement("div");
    flyer.className = "reward-flyer";
    flyer.textContent = emoji;
    parent.appendChild(flyer);
    const state = {
      el: flyer,
      x: from.x,
      y: from.y,
      vx: Math.cos(angle) * SCATTER_SPEED,
      vy: Math.sin(angle) * SCATTER_SPEED,
      to,
      phase: "pop",
      phaseStart: performance.now(),
      last: null,
    };
    paint(state, 0);

    function tick(now) {
      const phaseAge = now - state.phaseStart;
      if (state.phase === "pop") {
        const t = Math.min(1, phaseAge / POP_IN_MS);
        paint(state, 1 - Math.pow(1 - t, 3));
        if (t >= 1) {
          state.phase = "scatter";
          state.phaseStart = now;
        }
      } else if (state.phase === "scatter") {
        const t = Math.min(1, phaseAge / SCATTER_MS);
        const decay = 1 - t;
        state.x += state.vx * decay * MAX_DT_S;
        state.y += state.vy * decay * MAX_DT_S;
        paint(state, 1);
        if (t >= 1) {
          state.phase = "magnet";
          state.last = now;
        }
      } else {
        const dt = Math.min(MAX_DT_S, (now - state.last) / 1000);
        state.last = now;
        const dx = state.to.x - state.x;
        const dy = state.to.y - state.y;
        const dist = Math.hypot(dx, dy) || 1;
        state.vx += (dx / dist) * MAGNET_ACCEL * dt;
        state.vy += (dy / dist) * MAGNET_ACCEL * dt;
        const speed = Math.hypot(state.vx, state.vy);
        if (speed > MAGNET_MAX_SPEED) {
          state.vx = (state.vx / speed) * MAGNET_MAX_SPEED;
          state.vy = (state.vy / speed) * MAGNET_MAX_SPEED;
        }
        const stepX = state.vx * dt;
        const stepY = state.vy * dt;
        // per-axis clamp: the flyer can never move past the target, so it
        // can not overshoot and oscillate
        if (Math.abs(stepX) >= Math.abs(dx)) {
          state.x = state.to.x;
          state.vx = 0;
        } else {
          state.x += stepX;
        }
        if (Math.abs(stepY) >= Math.abs(dy)) {
          state.y = state.to.y;
          state.vy = 0;
        } else {
          state.y += stepY;
        }
        paint(state, 1);
        if (state.x === state.to.x && state.y === state.to.y) {
          flyer.remove();
          return;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function flyRewards(from, coins, gems, coinTargetEl, gemTargetEl, boundaryEl) {
    if (!from) return;
    const coinTarget = clampToScrollArea(centerOf(coinTargetEl) || from, boundaryEl);
    const gemTarget = clampToScrollArea(centerOf(gemTargetEl) || from, boundaryEl);
    const parent = ensureLayer();

    const coinCount = Math.min(MAX_SIMULTANEOUS, Math.floor(coins / COIN_DIVISOR));
    const gemCount = Math.min(MAX_SIMULTANEOUS, gems);
    for (let c = 0; c < coinCount; c++) {
      spawnFlyer(parent, "🪙", from, coinTarget, Math.random() * Math.PI * 2);
    }
    for (let g = 0; g < gemCount; g++) {
      spawnFlyer(parent, "💎", from, gemTarget, Math.random() * Math.PI * 2);
    }
  }

  window.RewardFlight = { flyRewards };
})();
