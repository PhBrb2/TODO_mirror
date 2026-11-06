import { CHEST_ITEM_ID, CHEST_PURCHASE_OPEN_MS, ICE_AGE_OPTIONS, ITEM_ROTATIONS, ITEM_TYPES, PLACEMENT_VERSION, SHOP_ITEMS, STREAK_FREEZE_GEM_COST } from "./game-constants.js";
import { levelFromXp } from "./game-progression.js";
import { announceAchievements, earnChest, trackAchievement } from "./game-rewards.js";
import { emitRender, emitToast, itemIsOwned, normalizePlaced, saveState, state } from "./game-state.js";

function shopItemById(id) {
  return SHOP_ITEMS.find((it) => it.id === id) || null;
}

function buyStreakFreeze() {
  if (state.gems < STREAK_FREEZE_GEM_COST) return { ok: false, reason: "gems" };
  state.gems -= STREAK_FREEZE_GEM_COST;
  state.streakFreezes += 1;
  emitToast(`\ud83c\uddf8\ufe0f Streak freeze bought \u2014 ${state.streakFreezes} available`);
  saveState();
  emitRender();
  return { ok: true };
}

function buyIceAge(optionIndex) {
  const option = ICE_AGE_OPTIONS[optionIndex];
  if (!option) return { ok: false, reason: "unknown" };
  if (state.iceAgeUntil > Date.now()) return { ok: false, reason: "active" };
  if (state.gems < option.gems) return { ok: false, reason: "gems" };
  state.gems -= option.gems;
  state.iceAgeUntil = Date.now() + option.hours * 3600000;
  emitToast(`\u2744\ufe0f Ice age started \u2014 all streaks protected for ${option.hours}h`);
  saveState();
  emitRender();
  return { ok: true };
}

function itemIsUnlockable(item) {
  return levelFromXp(state.xp) >= item.minLevel;
}

function purchaseItem(id) {
  const item = shopItemById(id);
  if (!item) return { ok: false, reason: "unknown" };
  if (itemIsOwned(id)) return { ok: false, reason: "owned" };
  if (!itemIsUnlockable(item)) return { ok: false, reason: "level" };
  if (state.coins < item.costCoins) return { ok: false, reason: "coins" };
  if (state.gems < item.costGems) return { ok: false, reason: "gems" };
  state.coins -= item.costCoins;
  state.gems -= item.costGems;
  state.ownedItems.push(id);
  state.achievements.stats.coinsSpent += item.costCoins;
  state.achievements.stats.itemsBought += 1;
  defaultPlaceItem(id);
  if (id === CHEST_ITEM_ID) earnChest(CHEST_PURCHASE_OPEN_MS);
  announceAchievements(trackAchievement({}));
  saveState();
  return { ok: true };
}

function itemPlacement(itemId) {
  return state.placedItems.find((p) => p.itemId === itemId) || null;
}

function cellTakenBy(cellIndex) {
  return state.placedItems.find(
    (p) => ITEM_TYPES[p.itemId] === "slab" && p.cellIndex === cellIndex
  ) || null;
}

function defaultPlaceItem(id) {
  if (itemPlacement(id)) return;
  const cell = ITEM_TYPES[id] === "slab" ? firstFreeCell() : 0;
  state.placedItems.push(normalizePlaced(id, cell, 0));
}

function firstFreeCell() {
  let cell = 0;
  while (cellTakenBy(cell)) cell++;
  return cell;
}

function placeItem(itemId, cellIndex) {
  const placement = itemPlacement(itemId);
  if (!placement) return { ok: false, reason: "not owned" };
  if (!Number.isInteger(cellIndex) || cellIndex < 0) return { ok: false, reason: "cell" };
  if (ITEM_TYPES[itemId] === "slab" && cellTakenBy(cellIndex)) {
    return { ok: false, reason: "occupied" };
  }
  const previousCell = placement.cellIndex;
  placement.cellIndex = cellIndex;
  placement.placementVersion = PLACEMENT_VERSION;
  const moved = cellIndex !== previousCell;
  saveState();
  if (moved) {
    announceAchievements(trackAchievement({
      itemMoves: state.achievements.stats.itemMoves + 1,
    }));
    saveState();
  }
  return { ok: true };
}

function rotateItem(itemId) {
  const placement = itemPlacement(itemId);
  if (!placement) return { ok: false, reason: "not owned" };
  placement.rotation = (placement.rotation + 1) % ITEM_ROTATIONS;
  placement.placementVersion = PLACEMENT_VERSION;
  saveState();
  announceAchievements(trackAchievement({
    itemMoves: state.achievements.stats.itemMoves + 1,
  }));
  saveState();
  return { ok: true };
}

export { buyIceAge, buyStreakFreeze, cellTakenBy, defaultPlaceItem, firstFreeCell, itemIsUnlockable, itemPlacement, placeItem, purchaseItem, rotateItem, shopItemById };
