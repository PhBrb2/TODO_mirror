import * as Game from "./game.js";
import { AppUI } from "./app-state.js";
import { renderBalances } from "./app-ui.js";
import { showToast } from "./app-ui.js";
import { render } from "./app-list.js";
import { buildSelect } from "./app-util.js";
import { exportBackupFile } from "./native-bridge.js";
import { ICONS } from "./game-icons.js";

const ACHIEVEMENT_STAT_KEYS = {
  first_step: "totalCompleted",
  task_master: "totalCompleted",
  marathon: "totalCompleted",
  streak_3: "bestStreak",
  early_bird: "morningCompleted",
  night_owl: "nightCompleted",
  weekend_warrior: "weekendCompleted",
  chain_gang: "chainedCompleted",
  bonus_hunter: "bonusCompleted",
  chests_opened: "chestsOpened",
  goal_getter: "dailyGoalsReached",
  big_spender: "coinsSpent",
  decorator: "itemsBought",
  redecorator: "itemMoves",
  fun_lover: "funCompleted",
};

function itemCostLabel(item) {
  if (item.costCoins > 0 && item.costGems > 0) {
    return `${item.costCoins} ${ICONS.coin} + ${item.costGems} ${ICONS.gem}`;
  }
  return item.costCoins > 0 ? `${item.costCoins} ${ICONS.coin}` : `${item.costGems} ${ICONS.gem}`;
}

function shopItemNode(item, onBuy) {
  const card = document.createElement("div");
  card.className = "shop-item";
  const owned = Game.itemIsOwned(item.id);
  const unlockable = Game.itemIsUnlockable(item);
  if (!unlockable) card.classList.add("locked");

  const emoji = document.createElement("div");
  emoji.className = "item-emoji";
  emoji.textContent = item.emoji;
  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = item.name;
  const cost = document.createElement("div");
  cost.className = "item-cost";
  cost.textContent = itemCostLabel(item);
  card.appendChild(emoji);
  card.appendChild(name);
  card.appendChild(cost);

  if (owned) {
    const tag = document.createElement("div");
    tag.className = "item-lock";
    tag.textContent = ICONS.checkMark + " owned";
    card.appendChild(tag);
  } else if (!unlockable) {
    const lock = document.createElement("div");
    lock.className = "item-lock";
    lock.textContent = `${ICONS.lock} Level ${item.minLevel}`;
    card.appendChild(lock);
  } else {
    const buy = document.createElement("button");
    buy.type = "button";
    buy.textContent = "Buy";
    buy.addEventListener("click", () => onBuy(item));
    card.appendChild(buy);
  }
  return card;
}

function streakFreezeNode(ctx) {
  const card = document.createElement("div");
  card.className = "shop-item";
  const emoji = document.createElement("div");
  emoji.className = "item-emoji";
  emoji.textContent = ICONS.flag;
  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = "Streak freeze";
  const cost = document.createElement("div");
  cost.className = "item-cost";
  cost.textContent = `${Game.STREAK_FREEZE_GEM_COST} ${ICONS.gem} ${ICONS.emDash} protects one streak for one missed period`;
  const stock = document.createElement("div");
  stock.className = "item-lock";
  stock.textContent = `${Game.state.streakFreezes} in stock`;
  const buy = document.createElement("button");
  buy.type = "button";
  buy.textContent = "Buy";
  buy.disabled = Game.state.gems < Game.STREAK_FREEZE_GEM_COST;
  buy.addEventListener("click", () => ctx.onBuyFreeze());
  card.appendChild(emoji);
  card.appendChild(name);
  card.appendChild(cost);
  card.appendChild(stock);
  card.appendChild(buy);
  return card;
}

function formatIceAgeRemaining(ms) {
  const hours = Math.ceil(ms / 3600000);
  if (hours < 1) return "<1h left";
  if (hours < 48) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}

function iceAgeNode(ctx) {
  const card = document.createElement("div");
  card.className = "shop-item";
  const emoji = document.createElement("div");
  emoji.className = "item-emoji";
  emoji.textContent = ICONS.snowflake;
  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = "Ice age";
  const cost = document.createElement("div");
  cost.className = "item-cost";
  cost.textContent = ICONS.gem + " " + ICONS.emDash + " protects all streaks while active";
  card.appendChild(emoji);
  card.appendChild(name);
  card.appendChild(cost);
  const remaining = Game.state.iceAgeUntil - Date.now();
  if (remaining > 0) {
    const active = document.createElement("div");
    active.className = "item-lock";
    card.appendChild(active);
    const update = () => {
      const left = Game.state.iceAgeUntil - Date.now();
      if (left <= 0) {
        clearInterval(timer);
        if (card.isConnected) renderShop(ctx);
        return;
      }
      active.textContent = `${ICONS.snowflake} Active ${ICONS.emDash} ${formatIceAgeRemaining(left)}`;
    };
    const timer = setInterval(() => {
      if (!card.isConnected) {
        clearInterval(timer);
        return;
      }
      update();
    }, 1000);
    update();
    return card;
  }
  const duration = buildSelect(
    Game.ICE_AGE_OPTIONS.map((opt, i) => [String(i), `${opt.hours}h ${ICONS.emDash} ${opt.gems} ${ICONS.gem}`]),
    "0"
  );
  duration.className = "ice-age-duration";
  const buy = document.createElement("button");
  buy.type = "button";
  buy.textContent = "Buy";
  buy.disabled = Game.state.gems < Game.ICE_AGE_OPTIONS[Number(duration.value)].gems;
  duration.addEventListener("change", () => {
    buy.disabled = Game.state.gems < Game.ICE_AGE_OPTIONS[Number(duration.value)].gems;
  });
  buy.addEventListener("click", () => ctx.onBuyIceAge(Number(duration.value)));
  card.appendChild(duration);
  card.appendChild(buy);
  return card;
}

function renderShop(ctx) {
  const { shopContent } = AppUI.els;
  shopContent.innerHTML = "";
  if (ctx.shopTab === "shop") {
    shopContent.appendChild(streakFreezeNode(ctx));
    shopContent.appendChild(iceAgeNode(ctx));
  }
  const items = ctx.shopTab === "shop"
    ? Game.SHOP_ITEMS
    : Game.SHOP_ITEMS.filter((it) => Game.itemIsOwned(it.id));
  if (ctx.shopTab === "owned" && items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "shop-empty";
    empty.textContent = "Nothing owned yet " + ICONS.emDash + " complete tasks to earn rewards!";
    shopContent.appendChild(empty);
    return;
  }
  for (const item of items) {
    shopContent.appendChild(shopItemNode(item, ctx.onBuy));
  }
  renderBalances();
}

function achievementProgressValue(a) {
  const stats = Game.state.achievements.stats;
  if (a.id === "collector") return Game.state.ownedItems.length;
  return stats[ACHIEVEMENT_STAT_KEYS[a.id]] ?? 0;
}

function achievementNode(a) {
  const card = document.createElement("div");
  const unlocked = Game.achievementIsUnlocked(a.id);
  card.className = "achievement" + (unlocked ? " unlocked" : "");
  const emoji = document.createElement("div");
  emoji.className = "item-emoji";
  emoji.textContent = unlocked ? a.emoji : ICONS.lock;
  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = a.name;
  const hint = document.createElement("div");
  hint.className = "item-cost";
  hint.textContent = a.hint;
  const progress = document.createElement("div");
  progress.className = "achievement-progress";
  const fill = document.createElement("div");
  fill.className = "achievement-progress-fill";
  fill.style.width = Math.min(100, (achievementProgressValue(a) / a.goal) * 100) + "%";
  progress.appendChild(fill);
  const label = document.createElement("div");
  label.className = "achievement-count";
  label.textContent = `${Math.min(achievementProgressValue(a), a.goal)}/${a.goal}`;
  card.appendChild(emoji);
  card.appendChild(name);
  card.appendChild(hint);
  card.appendChild(progress);
  card.appendChild(label);
  return card;
}

function renderAchievements() {
  const { achievementsContent } = AppUI.els;
  achievementsContent.innerHTML = "";
  const sorted = [...Game.ACHIEVEMENTS].sort((a, b) => {
    const ua = Game.achievementIsUnlocked(a.id) ? 1 : 0;
    const ub = Game.achievementIsUnlocked(b.id) ? 1 : 0;
    return ua - ub;
  });
  for (const a of sorted) achievementsContent.appendChild(achievementNode(a));
}

function setShopTab(ctx, tab) {
  ctx.shopTab = tab;
  AppUI.els.tabShop.classList.toggle("active", tab === "shop");
  AppUI.els.tabOwned.classList.toggle("active", tab === "owned");
  renderShop(ctx);
}

function renderWeekReview() {
  const els = AppUI.els;
  const entries = Game.weekCompletions();
  const n = entries.length;
  const coins = entries.reduce((s, e) => s + (e.coins || 0), 0);
  const gems = entries.reduce((s, e) => s + (e.gems || 0), 0);
  const praise =
    n === 0 ? ICONS.smile + " No tasks completed yet this week — a fresh start!"
    : n < 3 ? ICONS.star + " Nice start to your week!"
    : n < 7 ? ICONS.party + " Great week so far — keep it up!"
    : ICONS.fire + " Amazing week — you are on fire!";
  els.weekReviewContent.innerHTML = "";
  const p = document.createElement("p");
  p.className = "week-review-praise";
  p.textContent = praise;
  els.weekReviewContent.appendChild(p);
  const total = document.createElement("p");
  total.className = "week-review-total";
  total.textContent = `${n} task${n === 1 ? "" : "s"} completed this week · +${coins} ${ICONS.coin}${gems > 0 ? ` +${gems} ${ICONS.gem}` : ""}`;
  els.weekReviewContent.appendChild(total);
  if (n > 0) {
    const ul = document.createElement("ul");
    ul.className = "week-review-list";
    for (const e of entries) {
      const li = document.createElement("li");
      li.className = "week-review-item";
      const check = document.createElement("span");
      check.className = "week-review-check";
      check.textContent = ICONS.check;
      const title = document.createElement("span");
      title.className = "week-review-title";
      title.textContent = e.title;
      const rw = document.createElement("span");
      rw.className = "week-review-reward";
      rw.textContent = `+${e.coins || 0} ${ICONS.coin}${(e.gems || 0) > 0 ? ` +${e.gems} ${ICONS.gem}` : ""}`;
      li.append(check, title, rw);
      ul.appendChild(li);
    }
    els.weekReviewContent.appendChild(ul);
  }
  startWeekReviewAutoScroll();
}

// Slow automatic ping-pong scrolling of the review list while the overlay is
// open; stops when the user scrolls manually or the overlay is closed.
function stopWeekReviewAutoScroll() {
  const c = AppUI.els.weekReviewContent;
  if (c._reviewRaf) {
    cancelAnimationFrame(c._reviewRaf);
    c._reviewRaf = null;
  }
}

function startWeekReviewAutoScroll() {
  const c = AppUI.els.weekReviewContent;
  stopWeekReviewAutoScroll();
  const list = c.querySelector(".week-review-list");
  if (!list || list.scrollHeight <= list.clientHeight + 4) return;
  const SPEED = 16; // px/s
  let dir = 1;
  let pauseUntil = 0;
  let last = performance.now();
  let acc = 0; // fractional px accumulate here; scrollTop snaps to integers
  const step = (t) => {
    if (AppUI.els.weekReviewOverlay.classList.contains("hidden")) {
      c._reviewRaf = null;
      return;
    }
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (t >= pauseUntil) {
      acc += dir * SPEED * dt;
      const whole = Math.trunc(acc);
      if (whole !== 0) {
        list.scrollTop += whole;
        acc -= whole;
      }
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) {
        list.scrollTop = list.scrollHeight - list.clientHeight;
        dir = -1;
        pauseUntil = t + 2000;
      } else if (dir < 0 && list.scrollTop <= 0) {
        list.scrollTop = 0;
        dir = 1;
        pauseUntil = t + 2000;
      }
    }
    c._reviewRaf = requestAnimationFrame(step);
  };
  c._reviewRaf = requestAnimationFrame(step);
}

function openWeekReview() {
  AppUI.els.weekReviewOverlay.classList.remove("hidden");
  renderWeekReview(); // after unhiding, so scroll measurements are valid
  startWeekReviewSparkles();
}

function closeWeekReview() {
  AppUI.els.weekReviewOverlay.classList.add("hidden");
  stopWeekReviewSparkles();
}

// New-year-sparkler particles dripping down from one source on each side of
// the screen (like sparklers standing at the left/right screen edges), at the
// top of the review scroll view, while the overlay is open.
const REVIEW_SPARKLER_COLORS = ["#ffd700", "#ffe066", "#fff3b0", "#ffc300", "#ffee88"];

function stopWeekReviewSparkles() {
  const c = AppUI.els.weekReviewContent;
  if (c._sparklerTimer) {
    clearInterval(c._sparklerTimer);
    c._sparklerTimer = null;
  }
}

function startWeekReviewSparkles() {
  const c = AppUI.els.weekReviewContent;
  stopWeekReviewSparkles();
  const spawn = () => {
    if (AppUI.els.weekReviewOverlay.classList.contains("hidden")) {
      stopWeekReviewSparkles();
      return;
    }
    const host = c.querySelector(".week-review-list") || c;
    const r = host.getBoundingClientRect();
    if (r.width < 10) return;
    // One sparkler source at each side of the screen, at the top of the view.
    const y = r.top + 2;
    const opts = { colors: REVIEW_SPARKLER_COLORS, sizePx: 3, vyMin: 10, vyMax: 60, vx: 40, spin: 300, gravity: 550, lifetimeMs: 1200 };
    Confetti.burstAt({ x: 4, y, width: 10, height: 4 }, 10, opts);
    Confetti.burstAt({ x: Math.max(4, window.innerWidth - 14), y, width: 10, height: 4 }, 10, opts);
  };
  spawn();
  c._sparklerTimer = setInterval(spawn, 150);
}

function initOverlays() {
  const els = AppUI.els;
  const ctx = {
    shopTab: "shop",
    onBuy(item) {
      const result = Game.purchaseItem(item.id);
      if (result.ok) {
        showToast(`${ICONS.party} ${item.emoji} ${item.name} purchased!`);
        Game.saveState();
      } else if (result.reason === "coins" || result.reason === "gems") {
        showToast("Not enough coins/gems " + ICONS.brokenHeart);
      }
      renderShop(ctx);
    },
    onBuyFreeze() {
      const result = Game.buyStreakFreeze();
      if (!result.ok) showToast("Not enough gems " + ICONS.brokenHeart);
      renderShop(ctx);
    },
    onBuyIceAge(optionIndex) {
      const result = Game.buyIceAge(optionIndex);
      if (!result.ok && result.reason === "gems") showToast("Not enough gems " + ICONS.brokenHeart);
      renderShop(ctx);
    },
  };

  const openAchievements = () => {
    renderAchievements();
    els.achievementsOverlay.classList.remove("hidden");
  };
  const closeAchievements = () => els.achievementsOverlay.classList.add("hidden");
  els.achievementsBtn.addEventListener("click", openAchievements);
  els.achievementsClose.addEventListener("click", closeAchievements);
  els.achievementsOverlay.addEventListener("click", (e) => {
    if (e.target === els.achievementsOverlay) closeAchievements();
  });

  const openShop = () => {
    setShopTab(ctx, "shop");
    els.shopOverlay.classList.remove("hidden");
  };
  const closeShop = () => {
    els.shopOverlay.classList.add("hidden");
    render();
  };
  els.shopBtn.addEventListener("click", openShop);
  els.shopClose.addEventListener("click", closeShop);
  els.shopOverlay.addEventListener("click", (e) => {
    if (e.target === els.shopOverlay) closeShop();
  });

  const openSettings = () => els.settingsOverlay.classList.remove("hidden");
  els.weekReviewBtn.addEventListener("click", openWeekReview);
  els.weekReviewClose.addEventListener("click", closeWeekReview);
  for (const ev of ["wheel", "touchstart", "pointerdown"]) {
    els.weekReviewContent.addEventListener(ev, stopWeekReviewAutoScroll, { passive: true });
  }
  els.weekReviewOverlay.addEventListener("click", (e) => {
    if (e.target === els.weekReviewOverlay) closeWeekReview();
  });

  const closeSettings = () => els.settingsOverlay.classList.add("hidden");
  els.settingsBtn.addEventListener("click", openSettings);
  els.settingsClose.addEventListener("click", closeSettings);
  els.settingsOverlay.addEventListener("click", (e) => {
    if (e.target === els.settingsOverlay) closeSettings();
  });

  els.tabShop.addEventListener("click", () => setShopTab(ctx, "shop"));
  els.tabOwned.addEventListener("click", () => setShopTab(ctx, "owned"));

  els.dayStartSelect.value = String(Game.state.dayStartHour ?? 0);
  if (![...els.dayStartSelect.options].some((o) => o.value === els.dayStartSelect.value)) {
    els.dayStartSelect.value = "0";
  }
  els.dayStartSelect.addEventListener("change", () => {
    Game.setDayStartHour(Number(els.dayStartSelect.value));
    showToast(`${ICONS.sunrise} Your day now starts at ${els.dayStartSelect.value.padStart(2, "0")}:00`);
  });

  els.roomEnabledCheck.checked = Game.state.roomEnabled !== false;
  els.roomEnabledCheck.addEventListener("change", () => {
    Game.setRoomEnabled(els.roomEnabledCheck.checked);
    window.location.reload();
  });

  els.autoCleanCheck.checked = (Game.state.autoRemoveCompletedDays | 0) > 0;
  els.autoCleanCheck.addEventListener("change", () => {
    Game.setAutoRemoveCompletedDays(els.autoCleanCheck.checked ? 30 : 0);
    showToast(els.autoCleanCheck.checked
      ? `${ICONS.trash} Completed one-off tasks will be removed after 30 days`
      : `${ICONS.trash} Automatic removal disabled`);
  });

  els.exportBtn.addEventListener("click", async () => {
    const filename = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const json = Game.exportState();
    const path = await exportBackupFile(json, filename);
    if (path) {
      showToast(ICONS.floppy + " Saved to " + path);
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast(ICONS.floppy + " Backup exported");
    }
    Game.noteExport();
  });

  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", async () => {
    const file = els.importFile.files && els.importFile.files[0];
    els.importFile.value = "";
    if (!file) return;
    if (!confirm("Import will replace all current data. Continue?")) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Game.importState(data)) throw new Error("invalid backup");
      render();
      showToast(ICONS.folder + " Backup imported");
    } catch {
      showToast(ICONS.warning + " Invalid backup file");
    }
  });
}

export { ACHIEVEMENT_STAT_KEYS, achievementNode, achievementProgressValue, initOverlays, itemCostLabel, openWeekReview, renderAchievements, renderShop, renderWeekReview, setShopTab, shopItemNode, streakFreezeNode };
