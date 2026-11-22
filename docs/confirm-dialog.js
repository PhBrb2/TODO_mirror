(() => {
  "use strict";

  // Confirm dialog: modal overlay with a message and Confirm/Cancel buttons.
  // Resolves to true on confirm, false on cancel or overlay click.
  let overlay = null;

  function ensureOverlay() {
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement("div");
    overlay.className = "confirm-overlay hidden";
    const panel = document.createElement("div");
    panel.className = "confirm-panel";
    const msg = document.createElement("p");
    msg.className = "confirm-message";
    const actions = document.createElement("div");
    actions.className = "confirm-actions";
    panel.appendChild(msg);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    return overlay;
  }

  // buttons: [{ label, value, className?, focus? }]; resolves to the chosen
  // value, or null on cancel / overlay click / Escape. Enter = last button.
  function showDialog(message, buttons) {
    return new Promise((resolve) => {
      const el = ensureOverlay();
      el.querySelector(".confirm-message").textContent = message;
      const actions = el.querySelector(".confirm-actions");
      actions.innerHTML = "";
      const btns = buttons.map((b) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = b.className || "confirm-btn";
        btn.textContent = b.label;
        actions.appendChild(btn);
        return btn;
      });
      let settled = false;
      const handlers = buttons.map((b, i) => () => done(b.value));
      const done = (result) => {
        if (settled) return;
        settled = true;
        el.classList.add("hidden");
        el.removeEventListener("click", onOverlay);
        btns.forEach((b, i) => b.removeEventListener("click", handlers[i]));
        document.removeEventListener("keydown", onKey);
        resolve(result);
      };
      const onOverlay = (ev) => {
        if (ev.target === el) done(null);
      };
      const onKey = (ev) => {
        if (ev.key === "Escape") done(null);
        else if (ev.key === "Enter") done(buttons[buttons.length - 1].value);
      };
      el.addEventListener("click", onOverlay);
      btns.forEach((b, i) => b.addEventListener("click", handlers[i]));
      document.addEventListener("keydown", onKey);
      el.classList.remove("hidden");
      const focusBtn = btns[buttons.findIndex((b) => b.focus)];
      (focusBtn || btns[btns.length - 1]).focus();
    });
  }

  function confirmDialog(message) {
    return showDialog(message, [
      { label: "Cancel", value: false, className: "confirm-cancel" },
      { label: "Delete", value: true, className: "confirm-ok", focus: true },
    ]);
  }

  function choicesDialog(message, choices) {
    return showDialog(message, choices.map((c) => ({
      label: c.label,
      value: c.value,
      className: c.className || "confirm-btn",
      focus: Boolean(c.focus),
    })));
  }

  window.ConfirmDialog = { confirm: confirmDialog, choices: choicesDialog };
})();
