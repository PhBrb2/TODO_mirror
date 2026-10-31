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
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "confirm-cancel";
    cancelBtn.textContent = "Cancel";
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "confirm-ok";
    confirmBtn.textContent = "Delete";
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    panel.appendChild(msg);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    return overlay;
  }

  function confirmDialog(message) {
    return new Promise((resolve) => {
      const el = ensureOverlay();
      el.querySelector(".confirm-message").textContent = message;
      const okBtn = el.querySelector(".confirm-ok");
      const cancelBtn = el.querySelector(".confirm-cancel");
      const done = (result) => {
        el.classList.add("hidden");
        el.removeEventListener("click", onOverlay);
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      };
      const onOverlay = (ev) => {
        if (ev.target === el) done(false);
      };
      const onOk = () => done(true);
      const onCancel = () => done(false);
      const onKey = (ev) => {
        if (ev.key === "Escape") done(false);
        else if (ev.key === "Enter") done(true);
      };
      el.addEventListener("click", onOverlay);
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      document.addEventListener("keydown", onKey);
      el.classList.remove("hidden");
      okBtn.focus();
    });
  }

  window.ConfirmDialog = { confirm: confirmDialog };
})();
