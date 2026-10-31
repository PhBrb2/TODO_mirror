import { ACHIEVEMENTS, CHEST_OPEN_MS, COIN_REWARD, CUSTOM_REPEAT_DEFAULT_MS, ITEM_ROTATIONS, ITEM_TYPES, PLACEMENT_VERSION, REPEAT_VALUES, SCHEMA_VERSION, SHOP_ITEMS, STORAGE_KEY, TASK_LISTS } from "./game-constants.js";

function defaultAchievementStats() {
  return {
    totalCompleted: 0,
    morningCompleted: 0,
    nightCompleted: 0,
    bestStreak: 0,
    funCompleted: 0,
    itemMoves: 0,
    weekendCompleted: 0,
    chainedCompleted: 0,
    bonusCompleted: 0,
    chestsOpened: 0,
    dailyGoalsReached: 0,
    coinsSpent: 0,
    itemsBought: 0,
  };
}

function defaultState() {
  return {
    coins: 0,
    gems: 0,
    dailyCompleted: 0,
    tasks: [],
    nextId: 1,
    firstTaskStreak: 0,
    lastFirstTaskDayKey: null,
    weeklyCompleted: 0,
    weekKey: null,
    xp: 0,
    chests: [],
    boostUntil: 0,
    boostCooldownUntil: 0,
    lastDailyMilestone: 0,
    lastWeeklyMilestone: 0,
    ownedItems: [],
    placedItems: [],
    achievements: { unlocked: [], stats: defaultAchievementStats() },
    dayStartHour: 0,
    uiSheetHeightVh: 0,
  };
}

const state = defaultState();

function isRecord(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function num(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v, fallback) {
  return typeof v === "string" ? v : fallback;
}

const MIGRATE_REWARD = (raw) =>
  isRecord(raw)
    ? {
        coins: num(raw.coins, 0),
        gems: num(raw.gems, 0),
        xp: num(raw.xp, 0),
        chestEarned: raw.chestEarned === true,
        chestId: num(raw.chestId, null),
        firstTaskDay: num(raw.firstTaskDay, 0),
      }
    : null;

const MIGRATE_SUBTASK_REWARD = (raw) =>
  isRecord(raw)
    ? { coins: num(raw.coins, 0), gems: num(raw.gems, 0), xp: num(raw.xp, 0) }
    : null;

function migrateSubtask(st) {
  return {
    id: num(st.id, 0),
    title: str(st.title, "Untitled"),
    difficulty: st.difficulty in COIN_REWARD ? st.difficulty : "easy",
    done: st.done === true,
    chainedAfter: num(st.chainedAfter, 0),
    reward: MIGRATE_SUBTASK_REWARD(st.reward),
  };
}

const TASK_FIELD_MIGRATORS = {
  id: (raw, i) => num(raw.id, i + 1),
  title: (raw) => str(raw.title, "Untitled"),
  list: (raw) => (TASK_LISTS.includes(raw.list) ? raw.list : "todo"),
  difficulty: (raw) => (raw.difficulty in COIN_REWARD ? raw.difficulty : "easy"),
  repeat: (raw) => (REPEAT_VALUES.includes(raw.repeat) ? raw.repeat : "none"),
  done: (raw) => raw.done === true,
  createdAt: (raw) => num(raw.createdAt, Date.now()),
  completedAt: (raw) => (typeof raw.completedAt === "number" ? raw.completedAt : null),
  streak: (raw) => num(raw.streak, 0),
  streakDayKeys: (raw) =>
    Array.isArray(raw.streakDayKeys)
      ? raw.streakDayKeys.filter((k) => typeof k === "string")
      : [],
  bonus: (raw) => raw.bonus === true,
  deadline: (raw) => (typeof raw.deadline === "number" ? raw.deadline : null),
  repeatTime: (raw) => num(raw.repeatTime, NaN),
  repeatAfterCompletion: (raw) =>
    raw.repeatAfterCompletion === true || raw.repeatCustomFromCompletion === true,
  repeatWeekdays: (raw) => normalizeWeekdays(raw.repeatWeekdays, raw.repeatWeekday),
  repeatMonthlyWeekday: (raw) =>
    raw.repeatMonthlyWeekday == null
      ? null
      : Math.min(6, Math.max(0, Math.floor(num(raw.repeatMonthlyWeekday, 0)))),
  repeatMonthlyFirst: (raw) => raw.repeatMonthlyFirst === true,
  repeatCustomMs: (raw) => Math.max(60000, num(raw.repeatCustomMs, CUSTOM_REPEAT_DEFAULT_MS)),
  chainedAfter: (raw) => num(raw.chainedAfter, 0),
  timeLimit: (raw) => num(raw.timeLimit, 0),
  startedAt: (raw) => num(raw.startedAt, 0),
  ratedDifficulty: (raw) => raw.ratedDifficulty ?? null,
  difficultySuggested: (raw) => raw.difficultySuggested === true,
  completedViaSubtasks: (raw) => raw.completedViaSubtasks === true,
  reward: (raw) => MIGRATE_REWARD(raw.reward),
  subtasks: (raw) =>
    Array.isArray(raw.subtasks) ? raw.subtasks.filter(isRecord).map(migrateSubtask) : [],
};

function migrateTask(raw, i) {
  if (!isRecord(raw)) return null;
  const task = {};
  for (const [field, migrate] of Object.entries(TASK_FIELD_MIGRATORS)) {
    task[field] = migrate(raw, i);
  }
  return task;
}

function ownedItemIds(raw) {
  return Array.isArray(raw.ownedItems)
    ? raw.ownedItems.filter((id) => SHOP_ITEMS.some((it) => it.id === id))
    : [];
}

function normalizePlaced(itemId, cellIndex, rotation) {
  return {
    itemId,
    cellIndex,
    rotation: ((rotation % ITEM_ROTATIONS) + ITEM_ROTATIONS) % ITEM_ROTATIONS,
    placementVersion: PLACEMENT_VERSION,
  };
}

function migratePlacedItems(rawPlaced, ownedIds) {
  const valid = Array.isArray(rawPlaced)
    ? rawPlaced
        .filter((p) =>
          isRecord(p) &&
          ITEM_TYPES[p.itemId] &&
          ownedIds.includes(p.itemId) &&
          Number.isInteger(p.cellIndex) &&
          p.cellIndex >= 0)
        .map((p) => normalizePlaced(p.itemId, p.cellIndex, num(p.rotation, 0)))
    : [];
  const byItem = new Map();
  for (const p of valid) if (!byItem.has(p.itemId)) byItem.set(p.itemId, p);

  const slabCellsTaken = new Set();
  let nextCell = 0;
  const freeCell = () => {
    while (slabCellsTaken.has(nextCell)) nextCell++;
    const cell = nextCell;
    slabCellsTaken.add(cell);
    return cell;
  };

  const result = [];
  for (const id of ownedIds) {
    let p = byItem.get(id) || normalizePlaced(id, ITEM_TYPES[id] === "slab" ? freeCell() : 0, 0);
    if (ITEM_TYPES[id] === "slab") {
      if (slabCellsTaken.has(p.cellIndex)) p = normalizePlaced(id, freeCell(), p.rotation);
      else slabCellsTaken.add(p.cellIndex);
    }
    result.push(p);
  }
  return result;
}

function migrateAchievements(raw) {
  const stats = defaultAchievementStats();
  const rawStats = isRecord(raw) && isRecord(raw.stats) ? raw.stats : {};
  for (const key of Object.keys(stats)) {
    stats[key] = num(rawStats[key], 0);
  }
  const validIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const unlocked = Array.isArray(raw && raw.unlocked)
    ? raw.unlocked.filter((id) => validIds.has(id))
    : [];
  return { unlocked, stats };
}

function migrateState(raw) {
  if (!isRecord(raw)) return null;
  const ownedIds = ownedItemIds(raw);
  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.map(migrateTask).filter(Boolean)
    : [];
  return {
    coins: num(raw.coins, 0),
    gems: num(raw.gems, 0),
    dailyCompleted: num(raw.dailyCompleted, 0),
    tasks,
    nextId: num(raw.nextId, tasks.length + 1),
    firstTaskStreak: num(raw.firstTaskStreak, 0),
    lastFirstTaskDayKey: str(raw.lastFirstTaskDayKey, null),
    weeklyCompleted: num(raw.weeklyCompleted, 0),
    weekKey: str(raw.weekKey, null),
    xp: num(raw.xp, 0),
    chests: Array.isArray(raw.chests)
      ? raw.chests
          .filter(isRecord)
          .map((c) => ({
            id: num(c.id, 0),
            earnedAt: num(c.earnedAt, 0),
            opened: c.opened === true,
            openedAt: num(c.openedAt, 0),
            openDelayMs: num(c.openDelayMs, CHEST_OPEN_MS),
            contents: null,
          }))
      : [],
    boostUntil: num(raw.boostUntil, 0),
    boostCooldownUntil: num(raw.boostCooldownUntil, 0),
    lastDailyMilestone: raw.lastDailyMilestone ?? 0,
    lastWeeklyMilestone: raw.lastWeeklyMilestone ?? 0,
    ownedItems: ownedIds,
    placedItems: migratePlacedItems(raw.placedItems, ownedIds),
    achievements: migrateAchievements(raw.achievements),
    dayStartHour: Math.min(23, Math.max(0, Math.floor(num(raw.dayStartHour, 0)))),
    uiSheetHeightVh: Math.min(95, Math.max(0, num(raw.uiSheetHeightVh, 0))),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!isRecord(data)) return null;
    if (data.schemaVersion !== undefined && data.schemaVersion > SCHEMA_VERSION) {
      return null;
    }
    return migrateState(data.state);
  } catch {
    return null;
  }
}

function resetState() {
  Object.assign(state, defaultState());
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, state })
    );
  } catch {
    // storage full or unavailable: keep running in-memory
  }
  window.dispatchEvent(new CustomEvent("game-state-changed"));
}

function clampWeekdays(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((d) => Math.floor(Number(d))).filter((d) => d >= 0 && d <= 6))]
    .sort((a, b) => a - b);
}

function normalizeWeekdays(raw, legacySingle) {
  const fromArray = clampWeekdays(raw);
  if (fromArray.length > 0) return fromArray;
  if (Number.isFinite(legacySingle)) {
    return [Math.min(6, Math.max(0, Math.floor(legacySingle)))];
  }
  return [1];
}

const ui = {
  render() {},
  showToast() {},
  promptDifficultyRating() {},
};

function emitRender() { ui.render(); }

function emitToast(message) { ui.showToast(message); }

function emitPromptDifficultyRating(task) { ui.promptDifficultyRating(task); }

function itemIsOwned(id) {
  return state.ownedItems.includes(id);
}

export { clampWeekdays, defaultAchievementStats, defaultState, emitPromptDifficultyRating, emitRender, emitToast, isRecord, itemIsOwned, loadState, migrateAchievements, migratePlacedItems, migrateState, migrateTask, normalizePlaced, normalizeWeekdays, num, ownedItemIds, resetState, saveState, state, str, ui };
