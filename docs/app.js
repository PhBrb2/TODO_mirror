(() => {
  "use strict";

  const VERSION = "0.10.3";

  const STORAGE_KEY = "todo-mwe-state";
  const SCHEMA_VERSION = 3;

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

  const state = {
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
  };

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
      repeat: ["none", "daily", "weekly", "monthly", "every_5min"].includes(raw.repeat)
        ? raw.repeat
        : "none",
      done: raw.done === true,
      createdAt: num(raw.createdAt, Date.now()),
      completedAt: typeof raw.completedAt === "number" ? raw.completedAt : null,
      streak: num(raw.streak, 0),
      streakDayKeys: Array.isArray(raw.streakDayKeys)
        ? raw.streakDayKeys.filter((k) => typeof k === "string")
        : [],
      bonus: raw.bonus === true,
      deadline: typeof raw.deadline === "number" ? raw.deadline : null,
      ratedDifficulty: raw.ratedDifficulty ?? null,
      difficultySuggested: raw.difficultySuggested === true,
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

  const listEl = document.getElementById("task-list");
  const emptyHint = document.getElementById("empty-hint");
  const coinBalanceEl = document.getElementById("coin-balance");
  const gemBalanceEl = document.getElementById("gem-balance");
  const dailyProgressEl = document.getElementById("daily-progress");
  const dailyBar = document.getElementById("daily-bar");
  const weeklyProgressEl = document.getElementById("weekly-progress");
  const weeklyBar = document.getElementById("weekly-bar");
  const levelDisplayEl = document.getElementById("level-display");
  const chestAreaEl = document.getElementById("chest-area");
  const boostBannerEl = document.getElementById("boost-banner");
  const boostTimerEl = document.getElementById("boost-timer");
  const resetBtn = document.getElementById("reset-btn");
  const versionEl = document.getElementById("app-version");
  const form = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const difficultySelect = document.getElementById("difficulty-select");
  const repeatSelect = document.getElementById("repeat-select");
  const deadlineInput = document.getElementById("deadline-input");
  const toastEl = document.getElementById("toast");

  let toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2000);
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

  function nextOccurrence(repeat, completedAt) {
    if (repeat === "every_5min") return completedAt + 300000;
    const d = new Date(completedAt);
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
        if (nextOccurrence(task.repeat, task.completedAt) <= now) {
          task.done = false;
          task.completedAt = null;
          changed = true;
        }
      }
      if (streakHasFailed(task, now)) {
        task.streak = 0;
        task.streakDayKeys = [];
        changed = true;
      }
    }
    if (changed) render();
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
    const xpBefore = levelFromXp(state.xp);
    state.coins += coins;
    state.gems += gems;
    state.xp += xp;
    const leveledUp = levelFromXp(state.xp) > xpBefore;
    showToast(
      `📦 +${coins} 🪙 +${gems} 💎 +${xp} ✨` + (leveledUp ? ` — Level up!` : "")
    );
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
    if (state.lastFirstTaskDayKey !== today && state.dailyCompleted > 0) {
      state.dailyCompleted = 0;
    }
    const week = isoWeekKey(now);
    if (state.weekKey !== week) {
      state.weekKey = week;
      state.weeklyCompleted = 0;
    }
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
      ratedDifficulty: null,
      difficultySuggested: false,
    };
    if (isBonus) showToast("⭐ New bonus task! Extra rewards");
    state.tasks.push(task);
    render();
  }

  function reachedGoalCount(count) {
    return DAILY_GOALS.filter((g) => g <= count).length;
  }

  function completeTask(task) {
    task.done = true;
    task.completedAt = Date.now();

    if (task.repeat !== "none") {
      const key = repeatKey(task.repeat, task.completedAt);
      if (!task.streakDayKeys.includes(key)) {
        const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
        if (lastKey === prevRepeatKey(task.repeat, task.completedAt)) {
          task.streak += 1;
        } else {
          task.streak = 1;
        }
        task.streakDayKeys.push(key);
      }
    }

    const base = COIN_REWARD[task.difficulty];
    const mult = randomMultiplier();
    const streakMult = task.streak > 0 ? streakBonus(task.streak) : 1;
    let coins = Math.round(base * mult * streakMult);
    let gems = 0;

    if (isBoostActive()) coins = Math.round(coins * BOOST_MULT);

    if (GEM_CHANCE[task.difficulty] !== undefined && Math.random() < GEM_CHANCE[task.difficulty]) {
      gems += GEM_BONUS_AMOUNT;
    }

    if (task.bonus) {
      coins += BONUS_TASK_COINS;
      gems += BONUS_TASK_GEMS;
    }

    const firstBonus = applyFirstTaskBonus();
    if (firstBonus) {
      coins += firstBonus.coins;
      gems += firstBonus.gems;
    }

    const xpGain = XP_REWARD[task.difficulty] || 0;
    const xpBefore = levelFromXp(state.xp);
    state.xp += xpGain;
    const leveledUp = levelFromXp(state.xp) > xpBefore;

    if (firstBonus) {
      state.chests.push({
        id: state.nextId++,
        earnedAt: Date.now(),
        opened: false,
        openedAt: 0,
        contents: null,
      });
    }

    state.coins += coins;
    state.gems += gems;

    const goalsBefore = reachedGoalCount(state.dailyCompleted);
    state.dailyCompleted += 1;
    const goalsAfter = reachedGoalCount(state.dailyCompleted);

    const weekBefore = WEEKLY_GOALS.filter((g) => g <= state.weeklyCompleted).length;
    state.weeklyCompleted += 1;
    const weekAfter = WEEKLY_GOALS.filter((g) => g <= state.weeklyCompleted).length;

    let msg = "+";
    const parts = [];
    if (coins > 0) parts.push(`${coins} 🪙`);
    if (gems > 0) parts.push(`${gems} 💎`);
    if (parts.length === 0) parts.push("0 🪙");
    msg += parts.join(" + ");
    if (mult > 1.05) msg += ` (x${mult.toFixed(2)})`;
    if (task.streak > 1) msg += ` 🔥 ${task.streak}`;
    if (firstBonus && firstBonus.streak >= 3) {
      msg += ` 🌅 first task x${state.firstTaskStreak}`;
    }

    msg += ` +${xpGain} ✨`;

    if (leveledUp) {
      showToast(`🎉 Level up! You are now level ${levelFromXp(state.xp)}`);
    } else if (weekAfter > weekBefore) {
      state.coins += WEEKLY_GOAL_REWARD;
      showToast(`🏆 Weekly goal reached! +${WEEKLY_GOAL_REWARD} 🪙`);
      promptDifficultyRating(task);
      render();
      return;
    } else if (goalsAfter > goalsBefore) {
      state.coins += GOAL_REWARD;
      showToast(`🎉 Daily goal reached! +${GOAL_REWARD} 🪙`);
    } else {
      showToast(msg);
    }

    if (firstBonus) showToast("📦 Chest earned! Opens in 12h");
    maybeStartBoost();
    promptDifficultyRating(task);
    maybeSuggestDifficultyReduction(task);
    render();
  }

  function uncompleteTask(task) {
    task.done = false;
    const key = task.completedAt ? repeatKey(task.repeat, task.completedAt) : null;
    if (key && task.streakDayKeys.includes(key)) {
      task.streakDayKeys.pop();
      task.streak = Math.max(0, task.streak - 1);
    }
    task.completedAt = null;

    const base = COIN_REWARD[task.difficulty];
    const goalsBefore = reachedGoalCount(state.dailyCompleted);
    state.dailyCompleted = Math.max(0, state.dailyCompleted - 1);
    const goalsAfter = reachedGoalCount(state.dailyCompleted);

    state.coins = Math.max(0, state.coins - base);
    if (task.bonus) state.coins = Math.max(0, state.coins - BONUS_TASK_COINS);
    if (goalsAfter < goalsBefore) {
      state.coins = Math.max(0, state.coins - GOAL_REWARD);
    }
    render();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    render();
  }

  function editTask(id, updates) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    if (updates.title !== undefined) {
      const t = updates.title.trim();
      if (t) task.title = t;
    }
    if (updates.difficulty !== undefined && updates.difficulty in COIN_REWARD) {
      task.difficulty = updates.difficulty;
    }
    if (updates.repeat !== undefined &&
        ["none", "daily", "weekly", "monthly", "every_5min"].includes(updates.repeat)) {
      task.repeat = updates.repeat;
      if (updates.repeat === "none") {
        task.streak = 0;
        task.streakDayKeys = [];
      }
    }
    if (updates.deadline !== undefined) {
      task.deadline = updates.deadline ? new Date(updates.deadline).getTime() : null;
    }
    render();
  }

  const RATING_OPTIONS = [
    { label: "😫 Harder", value: "harder" },
    { label: "👌 As expected", value: "ok" },
    { label: "😊 Easier", value: "easier" },
  ];

  function promptDifficultyRating(task) {
    if (task.repeat === "none") return;
    if (task.ratedDifficulty != null) return;
    const panel = document.createElement("div");
    panel.className = "rating-panel";
    const q = document.createElement("span");
    q.textContent = `"${task.title}" — how was it?`;
    panel.appendChild(q);
    for (const opt of RATING_OPTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        task.ratedDifficulty = opt.value;
        panel.remove();
        if (opt.value === "easier") {
          showToast("😄 Noted! You can edit the task's difficulty.");
        } else {
          showToast("Noted, thanks!");
        }
        render();
      });
      panel.appendChild(btn);
    }
    document.body.appendChild(panel);
    setTimeout(() => panel.remove(), RATE_PROMPT_TIMEOUT);
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

  function formatDeadline(ts) {
    const diff = ts - Date.now();
    const abs = Math.abs(diff);
    const mins = Math.round(abs / 60000);
    let tstr;
    if (mins < 60) tstr = `${mins}m`;
    else if (mins < 1440) tstr = `${Math.round(mins / 60)}h`;
    else tstr = `${Math.round(mins / 1440)}d`;
    return diff >= 0 ? `⏰ ${tstr} left` : `⏰ ${tstr} overdue`;
  }

  function sortTasks(tasks) {
    const rank = { too_easy: 0, easy: 1, medium: 2, hard: 3 };
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const aDue = a.deadline && !a.done ? a.deadline : Infinity;
      const bDue = b.deadline && !b.done ? b.deadline : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      if (rank[a.difficulty] !== rank[b.difficulty]) {
        return rank[a.difficulty] - rank[b.difficulty];
      }
      return a.createdAt - b.createdAt;
    });
  }

  function taskNode(task) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");
    li.dataset.id = task.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = task.done;
    cb.addEventListener("change", () => {
      if (cb.checked) completeTask(task);
      else uncompleteTask(task);
    });

    const body = document.createElement("div");
    body.className = "task-body";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    const badge = document.createElement("span");
    badge.className = "badge " + task.difficulty;
    badge.textContent = task.difficulty.replace("_", " ");
    meta.appendChild(badge);
    if (task.repeat !== "none") {
      const rep = document.createElement("span");
      rep.className = "badge repeat";
      rep.textContent = "🔁 " + (task.repeat === "every_5min" ? "5 min" : task.repeat);
      meta.appendChild(rep);
      if (task.streak > 0) {
        const st = document.createElement("span");
        st.className = "badge streak";
        st.textContent = "🔥 " + task.streak;
        meta.appendChild(st);
      }
    }
    if (task.bonus) {
      const b = document.createElement("span");
      b.className = "badge bonus";
      b.textContent = "⭐ bonus";
      meta.appendChild(b);
    }
    if (task.deadline && !task.done) {
      const dl = document.createElement("span");
      dl.className = "badge deadline" + (task.deadline < Date.now() ? " overdue" : "");
      dl.textContent = formatDeadline(task.deadline);
      meta.appendChild(dl);
    }

    body.appendChild(title);
    body.appendChild(meta);

    const del = document.createElement("button");
    del.className = "task-delete";
    del.textContent = "✕";
    del.addEventListener("click", () => deleteTask(task.id));

    const edit = document.createElement("button");
    edit.className = "task-edit";
    edit.textContent = "✎";
    edit.addEventListener("click", () => openEditRow(task));

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(cb);
    li.appendChild(body);
    li.appendChild(actions);
    return li;
  }

  function deadlineInputValue(task) {
    if (!task.deadline) return "";
    const d = new Date(task.deadline);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEditRow(task) {
    document.querySelectorAll(".edit-row").forEach((el) => el.remove());
    const row = document.createElement("div");
    row.className = "edit-row";

    const input = document.createElement("input");
    input.type = "text";
    input.value = task.title;
    input.maxLength = 80;

    const diff = document.createElement("select");
    for (const [value, label] of [
      ["too_easy", "Too easy"],
      ["easy", "Easy"],
      ["medium", "Medium"],
      ["hard", "Hard"],
    ]) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      if (task.difficulty === value) o.selected = true;
      diff.appendChild(o);
    }

    const rep = document.createElement("select");
    for (const [value, label] of [
      ["none", "No repeat"],
      ["daily", "Daily"],
      ["weekly", "Weekly"],
      ["monthly", "Monthly"],
      ["every_5min", "Every 5 min (test)"],
    ]) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      if (task.repeat === value) o.selected = true;
      rep.appendChild(o);
    }

    const dl = document.createElement("input");
    dl.type = "datetime-local";
    dl.value = deadlineInputValue(task);

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.addEventListener("click", () => {
      editTask(task.id, {
        title: input.value,
        difficulty: diff.value,
        repeat: rep.value,
        deadline: dl.value,
      });
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => row.remove());

    row.appendChild(input);
    row.appendChild(diff);
    row.appendChild(rep);
    row.appendChild(dl);
    row.appendChild(save);
    row.appendChild(cancel);
    listEl.insertBefore(row, listEl.querySelector(`[data-id="${task.id}"]`).nextSibling);
  }

  let render = function () {
    const sorted = sortTasks(state.tasks);
    listEl.innerHTML = "";
    for (const task of sorted) listEl.appendChild(taskNode(task));

    emptyHint.classList.toggle("hidden", state.tasks.length > 0);
    coinBalanceEl.textContent = state.coins;
    gemBalanceEl.textContent = state.gems;

    const lastGoal = DAILY_GOALS[DAILY_GOALS.length - 1];
    const reached = reachedGoalCount(state.dailyCompleted);
    const nextGoal = DAILY_GOALS[reached] || lastGoal;
    const label =
      reached >= DAILY_GOALS.length
        ? `${state.dailyCompleted} ✅ all goals done`
        : `${state.dailyCompleted}/${nextGoal}`;
    dailyProgressEl.textContent = label;

    const pct = Math.min(100, (state.dailyCompleted / nextGoal) * 100);

    dailyBar.innerHTML = "";
    const fill = document.createElement("div");
    fill.className = "daily-bar-fill";
    fill.style.width = pct + "%";
    dailyBar.appendChild(fill);

    const lastWeekly = WEEKLY_GOALS[WEEKLY_GOALS.length - 1];
    const weekReached = WEEKLY_GOALS.filter((g) => g <= state.weeklyCompleted).length;
    const nextWeekly = WEEKLY_GOALS[weekReached] || lastWeekly;
    weeklyProgressEl.textContent =
      weekReached >= WEEKLY_GOALS.length
        ? `${state.weeklyCompleted} ✅`
        : `${state.weeklyCompleted}/${nextWeekly}`;
    weeklyBar.innerHTML = "";
    const wFill = document.createElement("div");
    wFill.className = "daily-bar-fill";
    wFill.style.width = Math.min(100, (state.weeklyCompleted / nextWeekly) * 100) + "%";
    weeklyBar.appendChild(wFill);

    const level = levelFromXp(state.xp);
    levelDisplayEl.textContent = level;
    document.getElementById("level-display-inline").textContent = level;
    const curLevelXp = levelStartXp(level);
    const nextLevelXp = xpForLevel(level + 1);
    document.getElementById("xp-progress").textContent =
      `${state.xp - curLevelXp}/${nextLevelXp - curLevelXp} XP`;

    chestAreaEl.innerHTML = "";
    const unopened = state.chests.filter((c) => !c.opened);
    if (unopened.length > 0) {
      const counter = document.createElement("span");
      counter.className = "chest-counter";
      counter.textContent = `📦 ${unopened.length}`;
      chestAreaEl.appendChild(counter);
    }
    const grouped = new Map();
    for (const chest of unopened) {
      const ready = chestReady(chest);
      const key = ready ? "ready" : `locked:${CHEST_OPEN_MS - (Date.now() - chest.earnedAt)}`;
      if (!grouped.has(key)) grouped.set(key, { chest, ready, count: 0 });
      grouped.get(key).count++;
    }
    for (const { chest, ready, count } of grouped.values()) {
      const btn = document.createElement("button");
      btn.type = "button";
      if (ready) {
        btn.className = "chest ready";
        btn.textContent = `📦 Open me!${count > 1 ? ` (x${count})` : ""}`;
        btn.addEventListener("click", () => openChest(chest));
      } else {
        btn.className = "chest waiting";
        btn.disabled = true;
        const remaining = CHEST_OPEN_MS - (Date.now() - chest.earnedAt);
        const h = Math.floor(remaining / 3600000);
        const m = Math.ceil((remaining % 3600000) / 60000);
        btn.textContent = `🔒 open in ${h}h ${m}m${count > 1 ? ` (x${count})` : ""}`;
      }
      chestAreaEl.appendChild(btn);
    }

    if (isBoostActive()) {
      boostBannerEl.classList.remove("hidden");
      const remaining = Math.max(0, state.boostUntil - Date.now());
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      boostTimerEl.textContent = `${m}m ${s}s`;
    } else {
      boostBannerEl.classList.add("hidden");
    }
  }

  versionEl.textContent = "v" + VERSION;

  const saved = loadState();
  if (saved) Object.assign(state, saved);
  rolloverCheckpoints();
  checkRecurringTasks();
  setInterval(checkRecurringTasks, 15000);
  setInterval(rolloverCheckpoints, 60000);
  setInterval(() => {
    if (isBoostActive() || state.chests.some(chestReady)) render();
  }, 1000);

  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset ALL data? This can not be undone.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    state.coins = 0;
    state.gems = 0;
    state.dailyCompleted = 0;
    state.tasks = [];
    state.nextId = 1;
    state.firstTaskStreak = 0;
    state.lastFirstTaskDayKey = null;
    state.weeklyCompleted = 0;
    state.weekKey = null;
    state.xp = 0;
    state.chests = [];
    state.boostUntil = 0;
    state.boostCooldownUntil = 0;
    render();
  });

  const baseRender = render;
  render = function () {
    baseRender();
    saveState();
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;
    addTask(title, difficultySelect.value, repeatSelect.value, deadlineInput.value);
    taskInput.value = "";
    taskInput.focus();
  });

  render();
})();
