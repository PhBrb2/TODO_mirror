import * as Game from "./game.js";
import { AppUI } from "./app-state.js";
import { state } from "./game-state.js";

const balanceAnim = new Map();

function animateBalance(el, target) {
  const from = Number(el.textContent) || 0;
  if (from === target) return;
  if (balanceAnim.has(el)) cancelAnimationFrame(balanceAnim.get(el));
  const start = performance.now();
  const duration = Math.min(900, 200 + Math.abs(target - from) * 30);
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * eased);
    if (t < 1) balanceAnim.set(el, requestAnimationFrame(tick));
    else balanceAnim.delete(el);
  }
  balanceAnim.set(el, requestAnimationFrame(tick));
}

function renderBalances() {
  animateBalance(AppUI.els.coinBalanceEl, Game.state.coins);
  animateBalance(AppUI.els.gemBalanceEl, Game.state.gems);
}

let toastTimer = null;

const toastQueue = [];

function displayNextToast() {
  const next = toastQueue.shift();
  if (next === undefined) {
    AppUI.els.toastEl.classList.add("hidden");
    toastTimer = null;
    return;
  }
  AppUI.els.toastEl.textContent = next;
  AppUI.els.toastEl.classList.remove("hidden");
  toastTimer = setTimeout(displayNextToast, 2000);
}

function showToast(message) {
  toastQueue.push(message);
  if (toastTimer === null) displayNextToast();
}

export { animateBalance, balanceAnim, displayNextToast, renderBalances, showToast, toastQueue, toastTimer };
