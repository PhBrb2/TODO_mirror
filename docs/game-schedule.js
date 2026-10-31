import { BONUS_TASK_RATE, CUSTOM_REPEAT_DEFAULT_MS, MULTIPLIER_MAX, MULTIPLIER_MIN, STREAK_BONUS_MAX, STREAK_BONUS_PER_DAY, STREAK_BONUS_START_DAY } from "./game-constants.js";
import { emitRender, saveState, emitToast, state } from "./game-state.js";

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

function shiftedDate(ts) {
  const d = new Date(ts);
  d.setHours(d.getHours() - (state.dayStartHour ?? 0));
  return d;
}

function dayKey(ts) {
  const d = shiftedDate(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function fiveMinKey(ts) {
  return `${dayKey(ts)}-${Math.floor(ts / 300000)}`;
}

const REPEAT_KEY_BUILDERS = {
  every_5min: (ts) => fiveMinKey(ts),
  custom: (ts) => fiveMinKey(ts),
  weekly: (ts) => {
    const d = shiftedDate(ts);
    return `${d.getFullYear()}-W${isoWeek(d)}`;
  },
  monthly: (ts) => {
    const d = shiftedDate(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  },
};

function repeatKey(task, ts) {
  const builder = REPEAT_KEY_BUILDERS[task.repeat];
  return builder ? builder(ts) : dayKey(ts);
}

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date - firstThursday) / 604800000);
}

function prevRepeatKey(task, ts) {
  if (task.repeat === "monthly") {
    const d = new Date(ts);
    d.setMonth(d.getMonth() - 1);
    return repeatKey(task, d.getTime());
  }
  if (task.repeat === "every_5min" || task.repeat === "custom") {
    return fiveMinKey(ts - (task.repeatCustomMs || CUSTOM_REPEAT_DEFAULT_MS));
  }
  if (task.repeat === "weekly") {
    const d = new Date(ts);
    d.setDate(d.getDate() - 7);
    return repeatKey(task, d.getTime());
  }
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

function timeOfDayMs(repeatTime) {
  return Number.isFinite(repeatTime)
    ? (Math.floor(repeatTime / 60) * 3600000 + (repeatTime % 60) * 60000)
    : 0;
}

function nextOccurrence(task, completedAt) {
  const repeat = task.repeat;
  if (repeat === "every_5min") return completedAt + 300000;
  if (repeat === "custom") {
    const interval = task.repeatCustomMs || CUSTOM_REPEAT_DEFAULT_MS;
    if (task.repeatAfterCompletion) return completedAt + interval;
    const anchor = task.createdAt || completedAt;
    const n = Math.floor((completedAt - anchor) / interval) + 1;
    return anchor + n * interval;
  }
  const base = Date.now();
  const d = new Date(base);
  const tod = timeOfDayMs(task.repeatTime);
  if (repeat === "daily") {
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    d.setTime(d.getTime() + tod);
    if (d.getTime() <= base) d.setTime(d.getTime() + 86400000);
    return d.getTime();
  }
  if (repeat === "weekly") {
    const weekdays = task.repeatWeekdays || [];
    for (let offset = 1; offset <= 7; offset++) {
      const candidate = new Date(base);
      candidate.setDate(candidate.getDate() + offset);
      if (!weekdays.includes(candidate.getDay())) continue;
      candidate.setHours(0, 0, 0, 0);
      candidate.setTime(candidate.getTime() + tod);
      if (candidate.getTime() > base) return candidate.getTime();
    }
    return Infinity;
  }
  if (repeat === "monthly") {
    for (let m = 1; m <= 2; m++) {
      const next = nthWeekdayOfMonth(d.getFullYear(), d.getMonth() + m, task.repeatMonthlyWeekday, task.repeatMonthlyFirst !== false);
      next.setHours(0, 0, 0, 0);
      next.setTime(next.getTime() + tod);
      if (next.getTime() > base) return next.getTime();
    }
    return Infinity;
  }
  return Infinity;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function nthWeekdayOfMonth(year, month, weekday, first) {
  if (weekday === null || weekday === undefined) {
    return new Date(year, month, 1);
  }
  if (first === false) {
    const lastDay = daysInMonth(year, month);
    const back = (new Date(year, month, lastDay).getDay() - weekday + 7) % 7;
    return new Date(year, month, lastDay - back);
  }
  const offset = (weekday - new Date(year, month, 1).getDay() + 7) % 7;
  return new Date(year, month, 1 + offset);
}

function streakHasFailed(task, now) {
  if (task.streak === 0 || task.streakDayKeys.length === 0) return false;
  const lastKey = task.streakDayKeys[task.streakDayKeys.length - 1];
  const currentKey = repeatKey(task, now);
  if (lastKey === currentKey) return false;
  return lastKey !== prevRepeatKey(task, now);
}

function checkRecurringTasks() {
  const now = Date.now();
  let changed = false;
  for (const task of state.tasks) {
    if (task.repeat === "none") continue;
    if (task.done && task.completedAt !== null) {
      if (nextOccurrence(task, task.completedAt) <= now) {
        task.done = false;
        task.completedAt = null;
        for (const st of task.subtasks) {
          st.done = false;
          st.reward = null;
        }
        const next = nextOccurrence(task, now);
        task.deadline = next === Infinity ? task.deadline : next;
        const hadBonus = task.bonus;
        task.bonus = Math.random() < BONUS_TASK_RATE;
        if (task.bonus && !hadBonus) emitToast(`⭐ "${task.title}" has a bonus reward this time!`);
        if (hadBonus !== task.bonus) changed = true;
        changed = true;
      }
    }
    if (streakHasFailed(task, now)) {
      task.streak = 0;
      task.streakDayKeys = [];
      changed = true;
    }
  }
  if (changed) { saveState(); emitRender(); }
}

function isoWeekKey(ts) {
  const d = shiftedDate(ts);
  return `${d.getFullYear()}-${isoWeek(d)}`;
}

export { checkRecurringTasks, dayKey, daysInMonth, fiveMinKey, isoWeek, isoWeekKey, nextOccurrence, nextTimeOfDay, nthWeekdayOfMonth, prevRepeatKey, randomMultiplier, repeatKey, streakBonus, streakHasFailed, timeOfDayMs };
