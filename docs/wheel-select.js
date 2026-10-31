(() => {
  "use strict";

  // Wheel select: a scroll-snap list that acts like a picker wheel. Flick or
  // scroll with the mouse wheel to move, it snaps to the nearest option and
  // fires onChange. Keyboard arrows work when the wheel has focus.
  const ITEM_HEIGHT_PX = 28;
  const COMPACT_ITEM_HEIGHT_PX = 20;

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
      if (scroll) {
        programmaticUntil = performance.now() + 400;
        track.scrollTo({ top: scrollTopForIndex(i), behavior: "smooth" });
      }
      onChange?.(value);
    }

    function itemIndexAtCenter() {
      return Math.max(0, Math.min(options.length - 1, Math.round(track.scrollTop / itemHeight)));
    }

    track.addEventListener("pointerdown", () => {
      programmaticUntil = 0;
      clearTimeout(scrollTimer);
    });

    track.addEventListener("scroll", () => {
      highlightIndex(itemIndexAtCenter());
      if (performance.now() < programmaticUntil) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        selectByIndex(itemIndexAtCenter(), true);
      }, 80);
    });

    track.addEventListener("scrollend", () => {
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
