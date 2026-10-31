import { BOOST_CHANCE_PER_COMPLETION, BOOST_COOLDOWN_MS, BOOST_DURATION_MS, BOOST_MULT, CHEST_OPEN_MS, FIRST_TASK_COINS_MULT, FIRST_TASK_GEM_CHANCE, GEM_BONUS_AMOUNT, XP_BASE_LEVEL } from "./game-constants.js";
import { dayKey, isoWeekKey } from "./game-schedule.js";
import { saveState, emitToast, state } from "./game-state.js";

function firstTaskTier(streak) {
  if (streak >= 7) return "day7";
  if (streak >= 3) return "day3_6";
  return "day1_2";
}

function xpForLevel(level) {
  return XP_BASE_LEVEL * level * (level + 1) / 2;
}

function levelFromXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

function levelStartXp(level) {
  return level === 1 ? 0 : xpForLevel(level);
}

function chestReady(chest) {
  if (chest.opened) return false;
  const openDelay = chest.openDelayMs ?? CHEST_OPEN_MS;
  return Date.now() - chest.earnedAt >= openDelay;
}

function isBoostActive() {
  return Date.now() < state.boostUntil;
}

function maybeStartBoost() {
  if (isBoostActive()) return;
  if (Date.now() < state.boostCooldownUntil) return;
  if (Math.random() >= BOOST_CHANCE_PER_COMPLETION) return;
  state.boostUntil = Date.now() + BOOST_DURATION_MS;
  state.boostCooldownUntil = state.boostUntil + BOOST_COOLDOWN_MS;
  emitToast(`⚡ Reward boost active! x${BOOST_MULT} for 1h`);
}

function rolloverCheckpoints() {
  const now = Date.now();
  const today = dayKey(now);
  let changed = false;
  if (state.lastFirstTaskDayKey !== today && state.dailyCompleted > 0) {
    state.dailyCompleted = 0;
    state.lastDailyMilestone = 0;
    changed = true;
  }
  const week = isoWeekKey(now);
  if (state.weekKey !== week) {
    state.weekKey = week;
    state.weeklyCompleted = 0;
    state.lastWeeklyMilestone = 0;
    changed = true;
  }
  if (changed) saveState();
}

function applyFirstTaskBonus() {
  const now = Date.now();
  const today = dayKey(now);
  if (state.lastFirstTaskDayKey === today) return null;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  state.firstTaskStreak =
    state.lastFirstTaskDayKey === dayKey(yesterday.getTime())
      ? state.firstTaskStreak + 1
      : 1;
  state.lastFirstTaskDayKey = today;

  const tier = firstTaskTier(state.firstTaskStreak);
  const coins = Math.round(FIRST_TASK_COINS_MULT[tier] * 10);
  const gems =
    Math.random() < FIRST_TASK_GEM_CHANCE[tier] ? GEM_BONUS_AMOUNT : 0;
  return { coins, gems, streak: state.firstTaskStreak };
}

export { applyFirstTaskBonus, chestReady, firstTaskTier, isBoostActive, levelFromXp, levelStartXp, maybeStartBoost, rolloverCheckpoints, xpForLevel };
