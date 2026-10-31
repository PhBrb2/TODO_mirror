import * as Game from "./game.js";
import { AppUI } from "./app-state.js";
import { renderBalances } from "./app-ui.js";
import { showToast } from "./app-ui.js";
import { render } from "./app-list.js";

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
    return `${item.costCoins} \ud83e\ude99 + ${item.costGems} \ud83d\udc8e`;
  }
  return item.costCoins > 0 ? `${item.costCoins} \ud83e\ude99` : `${item.costGems} \ud83d\udc8e`;
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
    tag.textContent = "\u2713 owned";
    card.appendChild(tag);
  } else if (!unlockable) {
    const lock = document.createElement("div");
    lock.className = "item-lock";
    lock.textContent = `\ud83d\udd12 Level ${item.minLevel}`;
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

function renderShop(ctx) {
  const { shopContent } = AppUI.els;
  shopContent.innerHTML = "";
  const items = ctx.shopTab === "shop"
    ? Game.SHOP_ITEMS
    : Game.SHOP_ITEMS.filter((it) => Game.itemIsOwned(it.id));
  if (ctx.shopTab === "owned" && items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "shop-empty";
    empty.textContent = "Nothing owned yet \u2014 complete tasks to earn rewards!";
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
  emoji.textContent = unlocked ? a.emoji : "\ud83d\udd12";
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

function initOverlays() {
  const els = AppUI.els;
  const ctx = {
    shopTab: "shop",
    onBuy(item) {
      const result = Game.purchaseItem(item.id);
      if (result.ok) {
        showToast(`\ud83c\udf89 ${item.emoji} ${item.name} purchased!`);
        Game.saveState();
      } else if (result.reason === "coins" || result.reason === "gems") {
        showToast("Not enough coins/gems \ud83d\udc94");
      }
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
    showToast(`\ud83c\udf05 Your day now starts at ${els.dayStartSelect.value.padStart(2, "0")}:00`);
  });
}

export { ACHIEVEMENT_STAT_KEYS, achievementNode, achievementProgressValue, initOverlays, itemCostLabel, renderAchievements, renderShop, setShopTab, shopItemNode };
