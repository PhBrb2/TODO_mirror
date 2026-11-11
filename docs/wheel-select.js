(() => {
  "use strict";

  // Wheel select: a picker wheel. Drag it 1:1 with a pointer or scroll
  // with the mouse wheel; it tweens to the nearest option and fires
  // onChange. Keyboard arrows work when the wheel has focus.
  const ITEM_HEIGHT_PX = 28;
  const COMPACT_ITEM_HEIGHT_PX = 20;
  const SNAP_MS_PER_ITEM = 30;
  const DRAG_RAMP_START_ITEMS = 4;
  const DRAG_RAMP_FACTOR = 1.2;
  const DRAG_RAMP_MAX_GAIN = 2.5;
  const DRAG_INERTIA_SCALE = 0.9;
  const DRAG_INERTIA_TAU_MS = 80;
  const DRAG_INERTIA_MAX_MS = 500;
  const DRAG_INERTIA_MIN_V = 0.02;

  function createWheelSelect(options, { selected, label, onChange, compact = false } = {}) {
    const itemHeight = compact ? COMPACT_ITEM_HEIGHT_PX : ITEM_HEIGHT_PX;
    const wrap = document.createElement("div");
    wrap.className = "wheel-select" + (compact ? " compact" : "");
    wrap.setAttribute("role", "listbox");
    wrap.setAttribute("aria-label", label || "");
    wrap.tabIndex = 0;

    const track = document.createElement("div");
    track.className = "wheel-select-track";
    wrap.appendChild(track);

    const items = options.map(([value, text], index) => {
      const item = document.createElement("div");
      item.className = "wheel-select-item";
      item.textContent = text;
      item.dataset.value = String(value);
      item.setAttribute("role", "option");
      item.setAttribute("id", `wheel-item-${index}`);
      track.appendChild(item);
      return item;
    });

    let value = String(selected ?? options[0][0]);
    let programmaticUntil = 0;
    let scrollTimer = null;

    function indexOfValue(v) {
      const i = options.findIndex(([opt]) => String(opt) === v);
      return i === -1 ? 0 : i;
    }

    function scrollTopForIndex(i) {
      return i * itemHeight;
    }

    function highlightIndex(i) {
      i = Math.max(0, Math.min(options.length - 1, i));
      items.forEach((el, idx) => el.classList.toggle("selected", idx === i));
      wrap.setAttribute("aria-activedescendant", items[i].id);
    }

    function selectByIndex(i, scroll = true) {
      i = Math.max(0, Math.min(options.length - 1, i));
      value = String(options[i][0]);
      highlightIndex(i);
      if (scroll) tweenToIndex(i);
      onChange?.(value);
    }

    let tweenToken = 0;
    let tweenRaf = 0;

    function cancelTween() {
      tweenToken += 1;
      cancelAnimationFrame(tweenRaf);
    }

    function tweenToIndex(i) {
      cancelTween();
      const token = tweenToken;
      const start = track.scrollTop;
      const target = scrollTopForIndex(i);
      const dist = Math.abs(target - start);
      if (dist < 0.5) {
        programmaticUntil = performance.now() + 100;
        track.scrollTop = target;
        return;
      }
      const duration = Math.min(300, 120 + (dist / itemHeight) * SNAP_MS_PER_ITEM);
      programmaticUntil = performance.now() + duration + 100;
      const t0 = performance.now();
      const frame = (now) => {
        if (token !== tweenToken) return;
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        track.scrollTop = start + (target - start) * eased;
        if (p < 1) tweenRaf = requestAnimationFrame(frame);
      };
      tweenRaf = requestAnimationFrame(frame);
    }

    function itemIndexAtCenter() {
      return Math.max(0, Math.min(options.length - 1, Math.round(track.scrollTop / itemHeight)));
    }

    let dragging = false;
    let dragLastY = 0;
    let dragStartScroll = 0;
    let dragOffset = 0;
    let dragDir = 0;
    let dragRamp = 0;
    let carryDir = 0;
    let carryLevel = 0;
    let lastMoveT = 0;
    let lastVy = 0;

    track.addEventListener("pointerdown", (ev) => {
      programmaticUntil = 0;
      cancelTween();
      clearTimeout(scrollTimer);
      dragging = true;
      dragLastY = ev.clientY;
      dragStartScroll = track.scrollTop;
      dragOffset = 0;
      dragDir = 0;
      dragRamp = 0;
      lastMoveT = performance.now();
      lastVy = 0;
      track.setPointerCapture?.(ev.pointerId);
    });

    track.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dy = dragLastY - ev.clientY;
      dragLastY = ev.clientY;
      if (dy === 0) return;
      const dir = Math.sign(dy);
      if (dir !== dragDir) {
        dragDir = dir;
        dragRamp = dir === carryDir
          ? dir * Math.max(DRAG_RAMP_START_ITEMS, carryLevel - 1)
          : 0;
        carryDir = 0;
      }
      dragRamp += dy / itemHeight;
      const items = Math.floor(Math.abs(dragRamp));
      const gain = items <= DRAG_RAMP_START_ITEMS
        ? 1
        : Math.min(DRAG_RAMP_MAX_GAIN, Math.pow(DRAG_RAMP_FACTOR, items - DRAG_RAMP_START_ITEMS));
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveT);
      lastVy = lastVy * 0.7 + (dy / dt) * 0.3;
      lastMoveT = now;
      dragOffset += dy * gain;
      const maxScroll = track.scrollHeight - track.clientHeight;
      dragOffset = Math.max(-dragStartScroll, Math.min(maxScroll - dragStartScroll, dragOffset));
      track.scrollTop = dragStartScroll + dragOffset;
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      carryDir = dragDir;
      carryLevel = Math.floor(Math.abs(dragRamp));
      const items = Math.floor(Math.abs(dragRamp));
      const gain = items <= DRAG_RAMP_START_ITEMS
        ? 1
        : Math.min(DRAG_RAMP_MAX_GAIN, Math.pow(DRAG_RAMP_FACTOR, items - DRAG_RAMP_START_ITEMS));
      const v = lastVy * (gain - 0.8) * DRAG_INERTIA_SCALE;
      if (Math.abs(v) < DRAG_INERTIA_MIN_V) {
        selectByIndex(itemIndexAtCenter(), true);
        return;
      }
      glide(v);
    };

    function glide(v) {
      cancelTween();
      const token = tweenToken;
      programmaticUntil = performance.now() + DRAG_INERTIA_MAX_MS + 100;
      let last = performance.now();
      const t0 = last;
      const frame = (now) => {
        if (token !== tweenToken) return;
        const dt = now - last;
        last = now;
        track.scrollTop += v * dt;
        v *= Math.exp(-dt / DRAG_INERTIA_TAU_MS);
        if (Math.abs(v) < DRAG_INERTIA_MIN_V || now - t0 > DRAG_INERTIA_MAX_MS) {
          selectByIndex(itemIndexAtCenter(), true);
          return;
        }
        tweenRaf = requestAnimationFrame(frame);
      };
      tweenRaf = requestAnimationFrame(frame);
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);

    track.addEventListener("scroll", () => {
      highlightIndex(itemIndexAtCenter());
      if (dragging) return;
      if (performance.now() < programmaticUntil) return;
      cancelTween();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        selectByIndex(itemIndexAtCenter(), true);
      }, 150);
    });

    track.addEventListener("scrollend", () => {
      if (dragging) return;
      if (performance.now() < programmaticUntil) return;
      clearTimeout(scrollTimer);
      selectByIndex(itemIndexAtCenter(), true);
    });

    wrap.addEventListener("keydown", (ev) => {
      const i = indexOfValue(value);
      if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        selectByIndex(i - 1);
      } else if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
        ev.preventDefault();
        selectByIndex(i + 1);
      } else if (ev.key === "Home") {
        ev.preventDefault();
        selectByIndex(0);
      } else if (ev.key === "End") {
        ev.preventDefault();
        selectByIndex(options.length - 1);
      }
    });

    highlightIndex(indexOfValue(value));
    requestAnimationFrame(() => {
      track.scrollTop = scrollTopForIndex(indexOfValue(value));
    });

    return {
      el: wrap,
      get value() {
        return value;
      },
      set value(v) {
        selectByIndex(indexOfValue(v));
      },
      set disabled(d) {
        wrap.classList.toggle("disabled", d);
        wrap.tabIndex = d ? -1 : 0;
      },
    };
  }

  window.WheelSelect = { createWheelSelect };
})();
