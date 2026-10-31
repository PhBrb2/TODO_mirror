import { ACHIEVEMENTS, BONUS_TASK_COINS, BONUS_TASK_GEMS, BOOST_MULT, CHEST_COINS, CHEST_GEMS, CHEST_OPEN_MS, CHEST_XP, COIN_REWARD, DAILY_GOALS, GEM_BONUS_AMOUNT, GEM_CHANCE, GOAL_REWARD, MORNING_END_HOUR, NIGHT_START_HOUR, TIME_BONUS_COINS, WEEKLY_GOALS, WEEKLY_GOAL_REWARD, XP_REWARD } from "./game-constants.js";
import { chestReady, isBoostActive, levelFromXp } from "./game-progression.js";
import { prevRepeatKey, randomMultiplier, repeatKey, streakBonus } from "./game-schedule.js";
import { emitRender, saveState, emitToast, state } from "./game-state.js";

function openChest(chest) {
  if (!chestReady(chest)) return;
  chest.opened = true;
  chest.openedAt = Date.now();
  announceAchievements(trackAchievement({
    chestsOpened: state.achievements.stats.chestsOpened + 1,
  }));
  const coins = CHEST_COINS[Math.floor(Math.random() * CHEST_COINS.length)];
  const gems = CHEST_GEMS[Math.floor(Math.random() * CHEST_GEMS.length)];
  const xp = CHEST_XP[Math.floor(Math.random() * CHEST_XP.length)];
  const leveledUp = grantXpAndCoins(coins, gems, xp);
  emitToast(
    `📦 +${coins} 🪙 +${gems} 💎 +${xp} ✨` + (leveledUp ? ` — Level up!` : "")
  );
  saveState();
  emitRender();
}

function grantXpAndCoins(coins, gems, xp) {
  const xpBefore = levelFromXp(state.xp);
  state.coins += coins;
  state.gems += gems;
  state.xp += xp;
  return levelFromXp(state.xp) > xpBefore;
}

function announceLevelUp() {
  emitToast(`🎉 Level up! You are now level ${levelFromXp(state.xp)}`);
}

function awardSubtask(subtask) {
  const { coins, xp } = baseReward(subtask.difficulty);
  const leveledUp = grantXpAndCoins(coins, 0, xp);
  subtask.reward = { coins, gems: 0, xp };
  if (leveledUp) {
    announceLevelUp();
  } else if (coins > 0) {
    emitToast(`+${coins} 🪙 +${xp} ✨`);
  }
}

function reachedGoalCount(count) {
  return DAILY_GOALS.filter((g) => g <= count).length;
}

function updateStreak(task, completedAt) {
  if (task.repeat === "none") return;
  const key = repeatKey(task, completedAt);
  if (task.streakDayKeys.includes(key)) return;
  const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
  task.streak = lastKey === prevRepeatKey(task, completedAt)
    ? task.streak + 1
    : 1;
  task.streakDayKeys.push(key);
}

function baseReward(difficulty, streakMult = 1) {
  const base = COIN_REWARD[difficulty] * streakMult;
  const mult = randomMultiplier();
  let coins = Math.round(base * mult);
  if (isBoostActive()) coins = Math.round(coins * BOOST_MULT);
  return { coins, xp: XP_REWARD[difficulty] || 0, mult };
}

function timeBonusEarned(task) {
  if (!task.timeLimit || !task.startedAt) return false;
  return Date.now() - task.startedAt <= task.timeLimit * 60000;
}

function applyTimeBonus(task, reward) {
  if (!timeBonusEarned(task)) return 0;
  const bonus = TIME_BONUS_COINS[task.difficulty] || 0;
  reward.coins += bonus;
  return bonus;
}

function computeReward(task) {
  const streakMult = task.streak > 0 ? streakBonus(task.streak) : 1;
  const reward = baseReward(task.difficulty, streakMult);
  reward.gems = 0;
  if (GEM_CHANCE[task.difficulty] !== undefined && Math.random() < GEM_CHANCE[task.difficulty]) {
    reward.gems += GEM_BONUS_AMOUNT;
  }
  if (task.bonus) {
    reward.coins += BONUS_TASK_COINS;
    reward.gems += BONUS_TASK_GEMS;
  }
  reward.timeBonus = applyTimeBonus(task, reward);
  return reward;
}

function earnChest(openDelayMs) {
  const chest = {
    id: state.nextId++,
    earnedAt: Date.now(),
    opened: false,
    openedAt: 0,
    contents: null,
    openDelayMs: openDelayMs ?? CHEST_OPEN_MS,
  };
  state.chests.push(chest);
  return chest.id;
}

function reachedWeeklyGoalCount(count) {
  return WEEKLY_GOALS.filter((g) => g <= count).length;
}

function grantMilestone(reached, milestoneKey, rewardAmount) {
  if (reached <= (state[milestoneKey] ?? 0)) return 0;
  state.coins += rewardAmount;
  state[milestoneKey] = reached;
  return rewardAmount;
}

function trackDailyGoal() {
  announceAchievements(trackAchievement({
    dailyGoalsReached: reachedGoalCount(state.dailyCompleted),
  }));
}

function clawBackMilestone(reached, milestoneKey, rewardAmount) {
  if (state[milestoneKey] === undefined || reached >= state[milestoneKey]) return;
  state.coins = Math.max(0, state.coins - rewardAmount);
  state[milestoneKey] = undefined;
}

function grantMilestones() {
  return {
    dailyReward: grantMilestone(
      reachedGoalCount(state.dailyCompleted), "lastDailyMilestone", GOAL_REWARD),
    weeklyReward: grantMilestone(
      reachedWeeklyGoalCount(state.weeklyCompleted), "lastWeeklyMilestone", WEEKLY_GOAL_REWARD),
  };
}

function buildRewardMessage(task, reward, firstBonus) {
  const parts = [];
  if (reward.coins > 0) parts.push(`${reward.coins} 🪙`);
  if (reward.gems > 0) parts.push(`${reward.gems} 💎`);
  if (parts.length === 0) parts.push("0 🪙");
  let msg = "+" + parts.join(" + ");
  if (reward.mult > 1.05) msg += ` (x${reward.mult.toFixed(2)})`;
  if (task.streak > 1) msg += ` 🔥 ${task.streak}`;
  if (reward.timeBonus > 0) msg += ` ⏱️ +${reward.timeBonus} on time`;
  if (firstBonus && firstBonus.streak >= 3) {
    msg += ` 🌅 first task x${state.firstTaskStreak}`;
  }
  msg += ` +${reward.xp} ✨`;
  return msg;
}

function achievementById(id) {
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}

function achievementIsUnlocked(id) {
  return state.achievements.unlocked.includes(id);
}

function trackAchievement(progress) {
  const stats = state.achievements.stats;
  for (const [key, value] of Object.entries(progress)) {
    if (typeof value === "number") stats[key] = Math.max(stats[key], value);
  }
  const collectorGoal = ACHIEVEMENTS.find((a) => a.id === "collector").goal;
  const checks = [
    ["first_step", stats.totalCompleted >= 1],
    ["task_master", stats.totalCompleted >= 25],
    ["streak_3", stats.bestStreak >= 3],
    ["early_bird", stats.morningCompleted >= 5],
    ["night_owl", stats.nightCompleted >= 5],
    ["collector", state.ownedItems.length >= collectorGoal],
    ["redecorator", stats.itemMoves >= 10],
    ["fun_lover", stats.funCompleted >= 10],
    ["weekend_warrior", stats.weekendCompleted >= 5],
    ["marathon", stats.totalCompleted >= 100],
    ["chain_gang", stats.chainedCompleted >= 5],
    ["bonus_hunter", stats.bonusCompleted >= 5],
    ["chests_opened", stats.chestsOpened >= 5],
    ["goal_getter", stats.dailyGoalsReached >= 5],
    ["big_spender", stats.coinsSpent >= 500],
    ["decorator", stats.itemsBought >= 1],
  ];
  const newly = [];
  for (const [id, reached] of checks) {
    if (reached && !achievementIsUnlocked(id)) {
      state.achievements.unlocked.push(id);
      newly.push(id);
    }
  }
  return newly;
}

function announceAchievements(ids) {
  for (const id of ids) {
    const a = achievementById(id);
    if (a) emitToast(`\ud83c\udfc6 Achievement unlocked: ${a.name}!`);
  }
}

function achievementProgressFromCompletion(task, completedAt) {
  const date = new Date(completedAt);
  const stats = state.achievements.stats;
  return {
    totalCompleted: stats.totalCompleted + 1,
    morningCompleted: stats.morningCompleted + (date.getHours() < MORNING_END_HOUR ? 1 : 0),
    nightCompleted: stats.nightCompleted + (date.getHours() >= NIGHT_START_HOUR ? 1 : 0),
    weekendCompleted: stats.weekendCompleted + (date.getDay() === 0 || date.getDay() === 6 ? 1 : 0),
    bestStreak: Math.max(stats.bestStreak, task.streak || 0),
    chainedCompleted: stats.chainedCompleted + (task.chainedAfter ? 1 : 0),
    bonusCompleted: stats.bonusCompleted + (task.bonus ? 1 : 0),
  };
}

export { achievementById, achievementIsUnlocked, achievementProgressFromCompletion, announceAchievements, announceLevelUp, applyTimeBonus, awardSubtask, baseReward, buildRewardMessage, clawBackMilestone, computeReward, earnChest, grantMilestone, grantMilestones, grantXpAndCoins, openChest, reachedGoalCount, reachedWeeklyGoalCount, timeBonusEarned, trackAchievement, trackDailyGoal, updateStreak };
