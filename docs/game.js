(() => {
  "use strict";


  const VERSION = "0.21.1";

  const STORAGE_KEY = "todo-mwe-state";
  const SCHEMA_VERSION = 3;

  const TIME_LIMIT_MINUTES = [5, 15, 30, 60];
  const TIME_BONUS_COINS = { too_easy: 0, easy: 5, medium: 10, hard: 20 };

  const COIN_REWARD = { too_easy: 0, easy: 10, medium: 25, hard: 50 };
  const DAILY_GOALS = [5, 10, 15, 25];
  const GOAL_REWARD = 15;
  const GEM_CHANCE = { medium: 0.25, hard: 0.5 };
  const GEM_BONUS_AMOUNT = 2;
  const MULTIPLIER_MIN = 1;
  const MULTIPLIER_MAX = 1.3;
  const STREAK_BONUS_START_DAY = 3;
  const STREAK_BONUS_PER_DAY = 0.1;
  const STREAK_BONUS_MAX = 1.9;
  const BONUS_TASK_RATE = 0.15;
  const BONUS_TASK_COINS = 10;
  const BONUS_TASK_GEMS = 1;
  const WEEKLY_GOALS = [10, 20, 30, 50];
  const WEEKLY_GOAL_REWARD = 25;
  const FIRST_TASK_COINS_MULT = { day1_2: 1, day3_6: 2.5, day7: 3 };
  const FIRST_TASK_GEM_CHANCE = { day1_2: 0, day3_6: 0.5, day7: 0.5 };
  const RATE_PROMPT_TIMEOUT = 10000;
  const DIFFICULTY_SUGGESTION_STREAK = 5;
  const XP_REWARD = { too_easy: 1, easy: 5, medium: 12, hard: 25 };
  const XP_BASE_LEVEL = 100;
  const CHEST_OPEN_MS = 12 * 60 * 60 * 1000;
  const CHEST_COINS = [20, 30, 40];
  const CHEST_GEMS = [1, 2];
  const CHEST_XP = [10, 20];
  const BOOST_MULT = 1.5;
  const BOOST_DURATION_MS = 60 * 60 * 1000;
  const BOOST_CHANCE_PER_COMPLETION = 0.1;
  const BOOST_COOLDOWN_MS = 2 * 60 * 60 * 1000;
  const SHOP_ITEMS = [
    { id: "plant",       name: "Plant",        emoji: "🪴", costCoins: 50,  costGems: 0, minLevel: 1 },
    { id: "lamp",        name: "Lamp",         emoji: "💡", costCoins: 100, costGems: 0, minLevel: 2 },
    { id: "poster",      name: "Poster",       emoji: "🖼️", costCoins: 150, costGems: 0, minLevel: 3 },
    { id: "rug",         name: "Rug",          emoji: "🧶", costCoins: 250, costGems: 0, minLevel: 4 },
    { id: "cat",         name: "Cat",          emoji: "🐱", costCoins: 400, costGems: 0, minLevel: 5 },
    { id: "crystal",     name: "Crystal",      emoji: "🔮", costCoins: 0,   costGems: 5, minLevel: 3 },
    { id: "trophy",      name: "Trophy",       emoji: "🏆", costCoins: 0,   costGems: 10, minLevel: 6 },
  ];

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
      dayStartHour: 0,
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

  function migrateTask(raw, i) {
    if (!isRecord(raw)) return null;
    return {
      id: num(raw.id, i + 1),
      title: str(raw.title, "Untitled"),
      difficulty: raw.difficulty in COIN_REWARD ? raw.difficulty : "easy",
      repeat: REPEAT_VALUES.includes(raw.repeat) ? raw.repeat : "none",
      done: raw.done === true,
      createdAt: num(raw.createdAt, Date.now()),
      completedAt: typeof raw.completedAt === "number" ? raw.completedAt : null,
      streak: num(raw.streak, 0),
      streakDayKeys: Array.isArray(raw.streakDayKeys)
        ? raw.streakDayKeys.filter((k) => typeof k === "string")
        : [],
      bonus: raw.bonus === true,
      deadline: typeof raw.deadline === "number" ? raw.deadline : null,
      repeatTime: num(raw.repeatTime, NaN),
      repeatAfterCompletion: raw.repeatAfterCompletion === true,
      chainedAfter: num(raw.chainedAfter, 0),
      timeLimit: num(raw.timeLimit, 0),
      startedAt: num(raw.startedAt, 0),
      ratedDifficulty: raw.ratedDifficulty ?? null,
      difficultySuggested: raw.difficultySuggested === true,
      completedViaSubtasks: raw.completedViaSubtasks === true,
      reward: isRecord(raw.reward)
        ? {
            coins: num(raw.reward.coins, 0),
            gems: num(raw.reward.gems, 0),
            xp: num(raw.reward.xp, 0),
            chestEarned: raw.reward.chestEarned === true,
            chestId: num(raw.reward.chestId, null),
            firstTaskDay: num(raw.reward.firstTaskDay, 0),
          }
        : null,
      subtasks: Array.isArray(raw.subtasks)
        ? raw.subtasks
            .filter(isRecord)
            .map((st) => ({
              id: num(st.id, 0),
              title: str(st.title, "Untitled"),
              difficulty: st.difficulty in COIN_REWARD ? st.difficulty : "easy",
              done: st.done === true,
              chainedAfter: num(st.chainedAfter, 0),
              reward: isRecord(st.reward)
                ? {
                    coins: num(st.reward.coins, 0),
                    gems: num(st.reward.gems, 0),
                    xp: num(st.reward.xp, 0),
                  }
                : null,
            }))
        : [],
    };
  }

  function migrateState(raw) {
    if (!isRecord(raw)) return null;
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
              contents: null,
            }))
        : [],
      boostUntil: num(raw.boostUntil, 0),
      boostCooldownUntil: num(raw.boostCooldownUntil, 0),
      lastDailyMilestone: raw.lastDailyMilestone ?? 0,
      lastWeeklyMilestone: raw.lastWeeklyMilestone ?? 0,
      ownedItems: Array.isArray(raw.ownedItems)
        ? raw.ownedItems.filter((id) => SHOP_ITEMS.some((it) => it.id === id))
        : [],
      dayStartHour: Math.min(23, Math.max(0, Math.floor(num(raw.dayStartHour, 0)))),
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
  }

  function randomMultiplier() {
    return MULTIPLIER_MIN + Math.random() * (MULTIPLIER_MAX - MULTIPLIER_MIN);
  }

  function streakBonus(streak) {
    if (streak < STREAK_BONUS_START_DAY) return 1;
    const extraDays = streak - STREAK_BONUS_START_DAY + 1;
    return Math.min(
      STREAK_BONUS_MAX,
      1 + extraDays * STREAK_BONUS_PER_DAY
    );
  }

  function dayKey(ts) {
    const d = new Date(ts);
    d.setHours(d.getHours() - (state.dayStartHour ?? 0));
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function fiveMinKey(ts) {
    return `${dayKey(ts)}-${Math.floor(ts / 300000)}`;
  }

  function repeatKey(repeat, ts) {
    if (repeat === "every_5min") return fiveMinKey(ts);
    return dayKey(ts);
  }

  function prevRepeatKey(repeat, ts) {
    if (repeat === "every_5min") return fiveMinKey(ts - 300000);
    const d = new Date(ts);
    d.setDate(d.getDate() - 1);
    return dayKey(d.getTime());
  }

  function nextTimeOfDay(minutes) {
    const next = new Date();
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return next.getTime();
  }

  function nextOccurrence(repeat, completedAt, repeatTime, repeatAfterCompletion) {
    if (repeat === "every_5min") return completedAt + 300000;
    const d = new Date(completedAt);
    if (repeatAfterCompletion) {
      if (repeat === "daily") {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        if (Number.isFinite(repeatTime)) {
          d.setHours(Math.floor(repeatTime / 60), repeatTime % 60, 0, 0);
        }
        if (d.getTime() <= completedAt) d.setTime(d.getTime() + 86400000);
        return d.getTime();
      }
      if (repeat === "weekly") {
        d.setDate(d.getDate() + 7);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      if (repeat === "monthly") {
        d.setMonth(d.getMonth() + 1);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
    }
    if (repeat === "daily" && Number.isFinite(repeatTime)) {
      const next = new Date(d);
      next.setHours(Math.floor(repeatTime / 60), repeatTime % 60, 0, 0);
      if (next.getTime() <= completedAt) next.setDate(next.getDate() + 1);
      return next.getTime();
    }
    if (repeat === "daily") {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (repeat === "weekly") {
      const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
      d.setDate(d.getDate() + daysUntilMonday);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (repeat === "monthly") {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    }
    return Infinity;
  }

  function streakHasFailed(task, now) {
    if (task.streak === 0 || task.streakDayKeys.length === 0) return false;
    const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
    const currentKey = repeatKey(task.repeat, now);
    if (lastKey === currentKey) return false;
    return lastKey !== prevRepeatKey(task.repeat, now);
  }

  function checkRecurringTasks() {
    const now = Date.now();
    let changed = false;
    for (const task of state.tasks) {
      if (task.repeat === "none") continue;
      if (task.done && task.completedAt !== null) {
        if (nextOccurrence(task.repeat, task.completedAt, task.repeatTime, task.repeatAfterCompletion) <= now) {
          task.done = false;
          task.completedAt = null;
          if (Number.isFinite(task.repeatTime)) {
            task.deadline = nextTimeOfDay(task.repeatTime);
          }
          if (task.bonus) {
            const wasBonus = task.bonus;
            task.bonus = Math.random() < BONUS_TASK_RATE;
            if (wasBonus && !task.bonus) changed = true;
            if (task.bonus && !wasBonus) showToast(`⭐ "${task.title}" has a bonus reward this time!`);
          }
          changed = true;
        }
      }
      if (streakHasFailed(task, now)) {
        task.streak = 0;
        task.streakDayKeys = [];
        changed = true;
      }
    }
    if (changed) { saveState(); render(); }
  }

  function isoWeekKey(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return `${d.getFullYear()}-${1 + Math.round(
      ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )}`;
  }

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
    return !chest.opened && Date.now() - chest.earnedAt >= CHEST_OPEN_MS;
  }

  function openChest(chest) {
    if (!chestReady(chest)) return;
    chest.opened = true;
    chest.openedAt = Date.now();
    const coins = CHEST_COINS[Math.floor(Math.random() * CHEST_COINS.length)];
    const gems = CHEST_GEMS[Math.floor(Math.random() * CHEST_GEMS.length)];
    const xp = CHEST_XP[Math.floor(Math.random() * CHEST_XP.length)];
    const leveledUp = grantXpAndCoins(coins, gems, xp);
    showToast(
      `📦 +${coins} 🪙 +${gems} 💎 +${xp} ✨` + (leveledUp ? ` — Level up!` : "")
    );
    saveState();
    render();
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
    showToast(`⚡ Reward boost active! x${BOOST_MULT} for 1h`);
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

  function addTask(title, difficulty, repeat, deadlineInput) {
    const isBonus = Math.random() < BONUS_TASK_RATE;
    const task = {
      id: state.nextId++,
      title,
      difficulty,
      repeat,
      done: false,
      createdAt: Date.now(),
      completedAt: null,
      streak: 0,
      streakDayKeys: [],
      bonus: isBonus,
      deadline: deadlineInput ? new Date(deadlineInput).getTime() : null,
      repeatTime: NaN,
      repeatAfterCompletion: false,
      chainedAfter: 0,
      timeLimit: 0,
      startedAt: 0,
      ratedDifficulty: null,
      difficultySuggested: false,
      completedViaSubtasks: false,
      subtasks: [],
    };
    if (isBonus) showToast("⭐ New bonus task! Extra rewards");
    state.tasks.push(task);
    saveState();
    render();
    return task.id;
  }

  const DIFFICULTY_ORDER = ["too_easy", "easy", "medium", "hard"];
  const REPEAT_VALUES = ["none", "daily", "weekly", "monthly", "every_5min"];

  function deriveDifficulty(task) {
    if (task.subtasks.length === 0) return task.difficulty;
    let best = "too_easy";
    for (const st of task.subtasks) {
      if (DIFFICULTY_ORDER.indexOf(st.difficulty) > DIFFICULTY_ORDER.indexOf(best)) {
        best = st.difficulty;
      }
    }
    return best;
  }

  function addSubtask(parentId, title, difficulty) {
    const parent = state.tasks.find((t) => t.id === parentId);
    if (!parent || !title) return;
    parent.subtasks.push({
      id: state.nextId++,
      title,
      difficulty,
      done: false,
      chainedAfter: 0,
    });
    parent.difficulty = deriveDifficulty(parent);
    saveState();
    render();
  }

  function editSubtask(parent, subtask, title, difficulty) {
    const t = (title || "").trim();
    if (t) subtask.title = t;
    if (difficulty in COIN_REWARD) subtask.difficulty = difficulty;
    parent.difficulty = deriveDifficulty(parent);
    saveState();
    render();
  }

  function chainPredecessorIn(siblings, item) {
    if (!item.chainedAfter) return null;
    return siblings.find((s) => s.id === item.chainedAfter) || null;
  }

  function chainSatisfiedIn(siblings, item) {
    const predecessor = chainPredecessorIn(siblings, item);
    return !predecessor || predecessor.done;
  }

  function chainWouldCycleIn(siblings, item, target) {
    if (target.id === item.id) return true;
    const predecessor = chainPredecessorIn(siblings, target);
    if (!predecessor) return false;
    return chainWouldCycleIn(siblings, item, predecessor);
  }

  function chainIn(siblings, item, targetId, linkEmoji) {
    if (!item || item.done) return { ok: false, reason: "not chainable" };
    const target = siblings.find((s) => s.id === targetId);
    if (!target || target.id === item.id) return { ok: false, reason: "invalid target" };
    if (target.chainedAfter === item.id) return { ok: false, reason: "would swap" };
    if (chainWouldCycleIn(siblings, item, target)) return { ok: false, reason: "cycle" };
    for (const other of siblings) {
      if (other.chainedAfter === item.id && other.id !== target.id) {
        other.chainedAfter = target.id;
      }
    }
    item.chainedAfter = target.id;
    saveState();
    render();
    showToast(`${linkEmoji} "${item.title}" is now chained after "${target.title}"`);
    return { ok: true };
  }

  function unchainIn(siblings, item) {
    if (!item.chainedAfter) return;
    const oldId = item.chainedAfter;
    item.chainedAfter = 0;
    for (const other of siblings) {
      if (other.chainedAfter === item.id) other.chainedAfter = oldId;
    }
    saveState();
    render();
  }

  function subtaskPredecessor(parent, subtask) {
    return chainPredecessorIn(parent.subtasks, subtask);
  }

  function subtaskChainSatisfies(parent, subtask) {
    return chainSatisfiedIn(parent.subtasks, subtask);
  }

  function chainSubtask(parent, subtask, targetId) {
    return chainIn(parent.subtasks, subtask, targetId, "\ud83d\udd17");
  }

  function unchainSubtask(parent, subtask) {
    return unchainIn(parent.subtasks, subtask);
  }

  function deleteSubtask(parent, subtaskId) {
    for (const other of parent.subtasks) {
      if (other.chainedAfter === subtaskId) other.chainedAfter = 0;
    }
    parent.subtasks = parent.subtasks.filter((s) => s.id !== subtaskId);
    parent.difficulty = deriveDifficulty(parent);
    saveState();
    render();
  }

  function toggleSubtask(parent, subtask) {
    subtask.done = !subtask.done;
    if (subtask.done) {
      if (!subtaskChainSatisfies(parent, subtask)) {
        subtask.done = false;
        const predecessor = subtaskPredecessor(parent, subtask);
        showToast(`\ud83d\udd17 "${subtask.title}" is chained \u2014 complete "${predecessor.title}" first`);
        saveState();
        render();
        return;
      }
      awardSubtask(subtask);
      if (parent.subtasks.every((st) => st.done) && !parent.done) {
        completeTask(parent);
        parent.completedViaSubtasks = true;
      }
    } else {
      clawBackReward(subtask.reward);
      subtask.reward = null;
      for (const other of parent.subtasks) {
        if (other.chainedAfter === subtask.id && other.done) toggleSubtask(parent, other);
      }
      if (parent.done && parent.completedViaSubtasks) {
        uncompleteTask(parent);
        parent.completedViaSubtasks = false;
      }
    }
    saveState();
    render();
  }

  function grantXpAndCoins(coins, gems, xp) {
    const xpBefore = levelFromXp(state.xp);
    state.coins += coins;
    state.gems += gems;
    state.xp += xp;
    return levelFromXp(state.xp) > xpBefore;
  }

  function announceLevelUp() {
    showToast(`🎉 Level up! You are now level ${levelFromXp(state.xp)}`);
  }

  function awardSubtask(subtask) {
    const { coins, xp } = baseReward(subtask.difficulty);
    const leveledUp = grantXpAndCoins(coins, 0, xp);
    subtask.reward = { coins, gems: 0, xp };
    if (leveledUp) {
      announceLevelUp();
    } else if (coins > 0) {
      showToast(`+${coins} 🪙 +${xp} ✨`);
    }
  }

  function reachedGoalCount(count) {
    return DAILY_GOALS.filter((g) => g <= count).length;
  }

  function updateStreak(task, completedAt) {
    if (task.repeat === "none") return;
    const key = repeatKey(task.repeat, completedAt);
    if (task.streakDayKeys.includes(key)) return;
    const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
    task.streak = lastKey === prevRepeatKey(task.repeat, completedAt)
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

  function earnChest() {
    const chest = {
      id: state.nextId++,
      earnedAt: Date.now(),
      opened: false,
      openedAt: 0,
      contents: null,
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

  function startTask(task) {
    if (task.done || !task.timeLimit) return;
    if (task.startedAt && Date.now() - task.startedAt < task.timeLimit * 60000) return;
    task.startedAt = Date.now();
    saveState();
    render();
  }

  function chainPredecessor(task) {
    return chainPredecessorIn(state.tasks, task);
  }

  function chainSatisfiesDependency(task) {
    return chainSatisfiedIn(state.tasks, task);
  }

  function chainTask(task, targetId) {
    return chainIn(state.tasks, task, targetId, "\ud83e\uddf1");
  }

  function unchainTask(task) {
    return unchainIn(state.tasks, task);
  }

  function completeTask(task) {
    if (!chainSatisfiesDependency(task)) {
      showToast(`\ud83e\uddf1 "${task.title}" is chained \u2014 complete "${chainPredecessor(task).title}" first`);
      return;
    }
    const reward = computeReward(task);
    task.done = true;
    task.startedAt = 0;
    task.completedAt = Date.now();
    updateStreak(task, task.completedAt);

    const firstBonus = applyFirstTaskBonus();
    if (firstBonus) {
      reward.coins += firstBonus.coins;
      reward.gems += firstBonus.gems;
    }

    const chestEarned = Boolean(firstBonus);
    const chestId = chestEarned ? earnChest() : null;

    const leveledUp = grantXpAndCoins(reward.coins, reward.gems, reward.xp);
    state.dailyCompleted += 1;
    state.weeklyCompleted += 1;
    const milestones = grantMilestones();

    task.reward = {
      coins: reward.coins,
      gems: reward.gems,
      xp: reward.xp,
      chestEarned,
      chestId,
      firstTaskDay: firstBonus ? firstBonus.streak : 0,
      timeBonus: reward.timeBonus || 0,
    };

    if (leveledUp) announceLevelUp();
    if (milestones.weeklyReward > 0) {
      showToast(`🏆 Weekly goal reached! +${WEEKLY_GOAL_REWARD} 🪙`);
    } else if (milestones.dailyReward > 0) {
      showToast(`🎉 Daily goal reached! +${GOAL_REWARD} 🪙`);
    }
    showToast(buildRewardMessage(task, reward, firstBonus));

    if (firstBonus) showToast("📦 Chest earned! Opens in 12h");
    maybeStartBoost();
    promptDifficultyRating(task);
    maybeSuggestDifficultyReduction(task);
    saveState();
    render();
  }

  function clawBackReward(reward) {
    if (!reward) return;
    state.coins = Math.max(0, state.coins - reward.coins);
    state.gems = Math.max(0, state.gems - reward.gems);
    state.xp = Math.max(0, state.xp - reward.xp);
    if (reward.chestEarned) {
      let idx = -1;
      if (reward.chestId !== undefined && reward.chestId !== null) {
        idx = state.chests.findIndex((c) => c.id === reward.chestId);
      }
      if (idx < 0) idx = state.chests.findIndex((c) => !c.opened);
      if (idx >= 0) state.chests.splice(idx, 1);
    }
  }

  function uncompleteTask(task) {
    task.done = false;
    task.startedAt = 0;
    for (const other of state.tasks) {
      if (other.chainedAfter === task.id && other.done) uncompleteTask(other);
    }
    const key = task.completedAt ? repeatKey(task.repeat, task.completedAt) : null;
    if (key && task.streakDayKeys.includes(key)) {
      task.streakDayKeys.pop();
      task.streak = Math.max(0, task.streak - 1);
    }
    task.completedAt = null;

    state.dailyCompleted = Math.max(0, state.dailyCompleted - 1);
    state.weeklyCompleted = Math.max(0, state.weeklyCompleted - 1);
    if (task.reward && task.reward.firstTaskDay > 0) {
      state.firstTaskStreak = Math.max(0, task.reward.firstTaskDay - 1);
      state.lastFirstTaskDayKey = null;
    }
    clawBackReward(task.reward);

    clawBackMilestone(
      reachedGoalCount(state.dailyCompleted), "lastDailyMilestone", GOAL_REWARD);
    clawBackMilestone(
      reachedWeeklyGoalCount(state.weeklyCompleted), "lastWeeklyMilestone", WEEKLY_GOAL_REWARD);

    task.reward = null;
    saveState();
    render();
  }

  function deleteTask(id) {
    for (const other of state.tasks) {
      if (other.chainedAfter === id) other.chainedAfter = 0;
    }
    state.tasks = state.tasks.filter((t) => t.id !== id);
    saveState();
    render();
  }

  function editTask(id, updates) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    if (updates.title !== undefined) {
      const t = updates.title.trim();
      if (t) task.title = t;
    }
    if (
      updates.difficulty !== undefined &&
      updates.difficulty in COIN_REWARD &&
      task.subtasks.length === 0
    ) {
      task.difficulty = updates.difficulty;
    }
    if (updates.repeat !== undefined &&
        REPEAT_VALUES.includes(updates.repeat)) {
      task.repeat = updates.repeat;
      if (updates.repeat === "none") {
        task.streak = 0;
        task.streakDayKeys = [];
      }
    }
    if (updates.deadline !== undefined) {
      task.deadline = updates.deadline ? new Date(updates.deadline).getTime() : null;
    }
    if (updates.repeatAfterCompletion !== undefined) {
      task.repeatAfterCompletion = updates.repeatAfterCompletion === true;
    }
    if (updates.timeLimit !== undefined) {
      task.timeLimit = TIME_LIMIT_MINUTES.includes(updates.timeLimit)
        ? updates.timeLimit
        : 0;
      if (!task.timeLimit) task.startedAt = 0;
    }
    if (updates.repeatTime !== undefined) {
      task.repeatTime = Number.isFinite(updates.repeatTime)
        ? Math.min(1439, Math.max(0, Math.floor(updates.repeatTime)))
        : NaN;
      if (Number.isFinite(task.repeatTime) && !task.done) {
        task.deadline = nextTimeOfDay(task.repeatTime);
      }
    }
    saveState();
    render();
  }

  function setDayStartHour(hour) {
    state.dayStartHour = Math.min(23, Math.max(0, Math.floor(hour)));
    saveState();
    render();
  }

  function maybeSuggestDifficultyReduction(task) {
    if (task.difficultySuggested) return;
    if (task.streak < DIFFICULTY_SUGGESTION_STREAK) return;
    if (task.ratedDifficulty === "harder") return;
    task.difficultySuggested = true;
    const order = Object.keys(COIN_REWARD);
    const idx = order.indexOf(task.difficulty);
    if (idx <= 0) return;
    showToast(
      `💡 "${task.title}" is going strong (🔥 ${task.streak}). Consider lowering its difficulty.`
    );
  }


  const ui = {
    render() {},
    showToast() {},
    promptDifficultyRating() {},
  };

  function render() { ui.render(); }
  function showToast(message) { ui.showToast(message); }
  function promptDifficultyRating(task) { ui.promptDifficultyRating(task); }

  function shopItemById(id) {
    return SHOP_ITEMS.find((it) => it.id === id) || null;
  }

  function itemIsOwned(id) {
    return state.ownedItems.includes(id);
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
    return { ok: true };
  }

  window.Game = {
    ui,
    STORAGE_KEY,
    SCHEMA_VERSION,
    COIN_REWARD,
    DAILY_GOALS,
    GOAL_REWARD,
    GEM_CHANCE,
    GEM_BONUS_AMOUNT,
    MULTIPLIER_MIN,
    MULTIPLIER_MAX,
    STREAK_BONUS_START_DAY,
    STREAK_BONUS_PER_DAY,
    STREAK_BONUS_MAX,
    BONUS_TASK_RATE,
    BONUS_TASK_COINS,
    BONUS_TASK_GEMS,
    WEEKLY_GOALS,
    WEEKLY_GOAL_REWARD,
    FIRST_TASK_COINS_MULT,
    FIRST_TASK_GEM_CHANCE,
    RATE_PROMPT_TIMEOUT,
    DIFFICULTY_SUGGESTION_STREAK,
    TIME_LIMIT_MINUTES,
    TIME_BONUS_COINS,
    XP_REWARD,
    XP_BASE_LEVEL,
    CHEST_OPEN_MS,
    CHEST_COINS,
    CHEST_GEMS,
    CHEST_XP,
    BOOST_MULT,
    BOOST_DURATION_MS,
    BOOST_CHANCE_PER_COMPLETION,
    BOOST_COOLDOWN_MS,
    VERSION,
    DIFFICULTY_ORDER,
    REPEAT_VALUES,
    defaultState,
    resetState,
    state,
    isRecord,
    num,
    str,
    migrateTask,
    migrateState,
    loadState,
    saveState,
    randomMultiplier,
    streakBonus,
    dayKey,
    fiveMinKey,
    repeatKey,
    prevRepeatKey,
    nextOccurrence,
    streakHasFailed,
    checkRecurringTasks,
    isoWeekKey,
    firstTaskTier,
    xpForLevel,
    levelFromXp,
    levelStartXp,
    chestReady,
    openChest,
    isBoostActive,
    maybeStartBoost,
    rolloverCheckpoints,
    applyFirstTaskBonus,
    addTask,
    startTask,
    timeBonusEarned,
    chainPredecessor,
    chainSatisfiesDependency,
    chainTask,
    unchainTask,
    subtaskPredecessor,
    subtaskChainSatisfies,
    chainSubtask,
    unchainSubtask,
    deleteSubtask,
    deriveDifficulty,
    addSubtask,
    editSubtask,
    toggleSubtask,
    grantXpAndCoins,
    announceLevelUp,
    awardSubtask,
    reachedGoalCount,
    updateStreak,
    baseReward,
    computeReward,
    earnChest,
    reachedWeeklyGoalCount,
    grantMilestone,
    clawBackMilestone,
    grantMilestones,
    buildRewardMessage,
    completeTask,
    clawBackReward,
    uncompleteTask,
    deleteTask,
    editTask,
    maybeSuggestDifficultyReduction,
    SHOP_ITEMS,
    shopItemById,
    itemIsOwned,
    itemIsUnlockable,
    purchaseItem,
    setDayStartHour,
  };
})();

