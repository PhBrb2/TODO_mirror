import * as Game from "./game.js";
import { AppUI } from "./app-state.js";
import { state } from "./game-state.js";
import { setUiSheetHeightVh } from "./game-tasks.js";

const SHEET_MIN_VH = 25;
const SHEET_TOP_GAP_PX = 8;

let vhProbeEl = null;
function getVhPx() {
  if (!vhProbeEl) {
    vhProbeEl = document.createElement("div");
    vhProbeEl.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none;";
    document.body.appendChild(vhProbeEl);
  }
  return vhProbeEl.getBoundingClientRect().height;
}

function getSheetMaxVh() {
  const topUiBottom = AppUI.els.topProgressEl ? AppUI.els.topProgressEl.getBoundingClientRect().bottom : 0;
  const availablePx = Math.max(0, window.innerHeight - topUiBottom - SHEET_TOP_GAP_PX);
  const maxVh = (availablePx / getVhPx()) * 100;
  return Math.max(SHEET_MIN_VH, maxVh);
}

function applySheetHeightVh(vh) {
  const clamped = Math.min(getSheetMaxVh(), Math.max(SHEET_MIN_VH, vh));
  AppUI.els.uiSheetEl.style.height = clamped + "vh";
  const roomApi = window.Room && window.Room.lastInstance;
  if (roomApi) roomApi.setVisibleHeightRatio(Math.max(0, 1 - clamped / 100));
}

function initUiSheet() {
  applySheetHeightVh(Game.state.uiSheetHeightVh || SHEET_MIN_VH);
  window.addEventListener("room-ready", () => {
    applySheetHeightVh(parseFloat(AppUI.els.uiSheetEl.style.height) || SHEET_MIN_VH);
  });
  window.addEventListener("resize", () => {
    applySheetHeightVh(parseFloat(AppUI.els.uiSheetEl.style.height) || SHEET_MIN_VH);
  });

  let dragging = false;
  let startY = 0;
  let startVh = 0;

  const onMove = (ev) => {
    if (!dragging) return;
    ev.preventDefault();
    const dy = ev.clientY - startY;
    const vhPerPx = 100 / getVhPx();
    const next = Math.min(getSheetMaxVh(), Math.max(SHEET_MIN_VH, startVh - dy * vhPerPx));
    applySheetHeightVh(next);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    Game.setUiSheetHeightVh(parseFloat(AppUI.els.uiSheetEl.style.height));
  };
  AppUI.els.sheetHandleEl.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    dragging = true;
    startY = ev.clientY;
    startVh = parseFloat(AppUI.els.uiSheetEl.style.height) || SHEET_MIN_VH;
    AppUI.els.sheetHandleEl.setPointerCapture?.(ev.pointerId);
    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  });
}

function initActionsToggle() {
  AppUI.els.toggleActionsBtn.addEventListener("click", () => {
    const hidden = document.body.classList.toggle("actions-hidden");
    AppUI.els.toggleActionsBtn.setAttribute("aria-pressed", String(!hidden));
    AppUI.els.toggleActionsBtn.setAttribute(
      "aria-label",
      hidden ? "Show edit and delete buttons" : "Hide edit and delete buttons"
    );
  });
}

initActionsToggle = initActionsToggle;

export { SHEET_MIN_VH, SHEET_TOP_GAP_PX, applySheetHeightVh, getSheetMaxVh, getVhPx, initActionsToggle, initUiSheet, vhProbeEl };
