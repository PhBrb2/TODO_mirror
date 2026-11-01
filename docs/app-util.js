import { chainHead } from "./game-tasks.js";

const DIFFICULTY_OPTIONS = [
  ["too_easy", "Too easy"],
  ["easy", "Easy"],
  ["medium", "Medium"],
  ["hard", "Hard"],
];

const REPEAT_OPTIONS = [
  ["none", "No repeat"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["every_5min", "Every 5 min (test)"],
  ["custom", "Custom"],
];

const WEEKDAY_CHECKBOXES = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"],
  [5, "Fri"], [6, "Sat"], [0, "Sun"],
];

const CUSTOM_DAYS_OPTIONS = Array.from({ length: 31 }, (_, i) => [i, i === 1 ? "1 day" : `${i} days`]);

const CUSTOM_HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => [i, i === 1 ? "1 hour" : `${i} hours`]);

const CUSTOM_MINUTES_OPTIONS = Array.from({ length: 60 }, (_, i) => [i, i === 1 ? "1 min" : `${i} min`]);

const TIME_OF_DAY_HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => [i, String(i).padStart(2, "0")]);

const TIME_OF_DAY_MINUTES_OPTIONS = Array.from({ length: 60 }, (_, i) => [i, String(i).padStart(2, "0")]);

const TIME_LIMIT_OPTIONS = [
  [0, "No time limit"],
  [5, "5 min"],
  [15, "15 min"],
  [30, "30 min"],
  [60, "60 min"],
];

const LIST_OPTIONS = [
  ["todo", "Todo"],
  ["backlog", "Backlog"],
  ["fun", "Fun"],
];

function createWheel(options, selected, label, onChange, compact = false) {
  return WheelSelect.createWheelSelect(options, { selected, label, onChange, compact });
}

function mountWheel(containerId, options, selected, label, onChange) {
  const wheel = createWheel(options, selected, label, onChange);
  document.getElementById(containerId).appendChild(wheel.el);
  return wheel;
}

function isRepeatingRepeat(repeat) {
  return repeat !== "none" && repeat !== "every_5min";
}

const END_OF_DAY_MINUTES = 23 * 60 + 59;

function createDueAtWheels(minutes, compact = false) {
  const m = Number.isFinite(minutes) ? minutes : 9 * 60;
  const endOfDayBtn = document.createElement("button");
  endOfDayBtn.type = "button";
  endOfDayBtn.className = "end-of-day-btn";
  endOfDayBtn.textContent = "End of day";
  endOfDayBtn.title = "Set to 23:59";
  const hour = createWheel(TIME_OF_DAY_HOURS_OPTIONS, Math.floor(m / 60), "Hour", updateEndOfDayBtn, compact);
  const minute = createWheel(TIME_OF_DAY_MINUTES_OPTIONS, m % 60, "Minute", updateEndOfDayBtn, compact);
  const read = () => Number(hour.value) * 60 + Number(minute.value);
  function updateEndOfDayBtn() {
    endOfDayBtn.classList.toggle("on", read() === END_OF_DAY_MINUTES);
  }
  endOfDayBtn.addEventListener("click", () => {
    hour.value = "23";
    minute.value = "59";
    updateEndOfDayBtn();
  });
  updateEndOfDayBtn();
  return { els: [hour.el, minute.el], read, endOfDayBtn };
}

function readScheduleValues(read) {
  const out = {};
  for (const key of Object.keys(read)) out[key] = read[key]();
  return out;
}

function buildSelect(options, selected) {
  const select = document.createElement("select");
  for (const [value, label] of options) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    if (selected === value) o.selected = true;
    select.appendChild(o);
  }
  return select;
}

function formatMinutesSeconds(remaining) {
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return `${m}m ${s}s`;
}

function timeLimitRemaining(task, now) {
  if (!task.timeLimit || !task.startedAt) return null;
  return task.startedAt + task.timeLimit * 60000 - now;
}

function formatDeadline(ts) {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  if (diff < 0) {
    const hours = Math.floor(abs / 3600000);
    const days = Math.floor(abs / 86400000);
    if (days >= 1) return `⏰ ${days}d overdue`;
    if (hours >= 1) return `⏰ ${hours}h overdue`;
    return `⏰ overdue`;
  }
  const mins = Math.round(diff / 60000);
  let tstr;
  if (mins < 60) tstr = `${mins}m`;
  else if (mins < 1440) tstr = `${Math.round(mins / 60)}h`;
  else tstr = `${Math.round(mins / 1440)}d`;
  return `⏰ ${tstr} left`;
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

function chainOrdered(items, base) {
  const ordered = base || items;
  const baseIndex = new Map(ordered.map((it, i) => [it.id, i]));
  const emitted = new Set();
  const result = [];
  const emitFrom = (item) => {
    if (emitted.has(item.id)) return;
    emitted.add(item.id);
    result.push(item);
    const successors = items
      .filter((it) => it.chainedAfter === item.id)
      .sort((a, b) => baseIndex.get(a.id) - baseIndex.get(b.id));
    for (const s of successors) emitFrom(s);
  };
  for (const item of ordered) {
    if (emitted.has(item.id)) continue;
    emitFrom(chainHead(items, item));
  }
  return result;
}

function chainLinkNode(className, onUnlink, { withLine = true } = {}) {
  const row = document.createElement(className === "chain-link-row" ? "li" : "div");
  row.className = className + (withLine ? "" : " chain-icon-only");
  if (withLine) {
    const line = document.createElement("span");
    line.className = "chain-line";
    row.appendChild(line);
  }
  const unlink = document.createElement("button");
  unlink.type = "button";
  unlink.className = "chain-unlink";
  unlink.textContent = "🔗";
  unlink.title = "Chained \u2014 click to remove the link";
  unlink.addEventListener("click", onUnlink);
  row.appendChild(unlink);
  return row;
}

const DELETE_ARM_MS = 2000;

function armDeleteButton(btn, onConfirmDelete) {
  let armTimer = null;
  btn.addEventListener("click", () => {
    if (armTimer) {
      clearTimeout(armTimer);
      armTimer = null;
      btn.classList.remove("armed");
      onConfirmDelete();
      return;
    }
    btn.classList.add("armed");
    armTimer = setTimeout(() => {
      armTimer = null;
      btn.classList.remove("armed");
    }, DELETE_ARM_MS);
  });
}

function deadlineInputValue(task) {
  if (!task.deadline) return "";
  const d = new Date(task.deadline);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function scheduleValuesFromTask(task) {
  const customMs = task.repeatCustomMs ?? 86400000;
  return {
    deadline: task.deadline || null,
    repeatTime: Number.isFinite(task.repeatTime) ? task.repeatTime : null,
    repeatWeekdays: task.repeatWeekdays,
    repeatMonthlyWeekday: task.repeatMonthlyWeekday ?? null,
    repeatMonthlyFirst: task.repeatMonthlyFirst,
    customDays: Math.floor(customMs / 86400000),
    customHours: Math.floor(customMs / 3600000) % 24,
    customMinutes: Math.floor(customMs / 60000) % 60,
    repeatAfterCompletion: task.repeatAfterCompletion,
  };
}

function labeledField(labelText, els, hidden = false, labelExtra = null) {
  const field = document.createElement("div");
  field.className = "labeled-field" + (hidden ? " hidden" : "");
  if (labelExtra) {
    const labelRow = document.createElement("div");
    labelRow.className = "field-label-row";
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = labelText;
    labelRow.appendChild(label);
    labelRow.appendChild(labelExtra);
    field.appendChild(labelRow);
  } else {
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = labelText;
    field.appendChild(label);
  }
  for (const el of els) field.appendChild(el);
  return field;
}

export { CUSTOM_DAYS_OPTIONS, DELETE_ARM_MS, CUSTOM_HOURS_OPTIONS, CUSTOM_MINUTES_OPTIONS, DIFFICULTY_OPTIONS, LIST_OPTIONS, REPEAT_OPTIONS, TIME_LIMIT_OPTIONS, TIME_OF_DAY_HOURS_OPTIONS, TIME_OF_DAY_MINUTES_OPTIONS, WEEKDAY_CHECKBOXES, armDeleteButton, buildSelect, chainLinkNode, chainOrdered, createDueAtWheels, createWheel, deadlineInputValue, formatDeadline, formatMinutesSeconds, isRepeatingRepeat, labeledField, mountWheel, readScheduleValues, scheduleValuesFromTask, sortTasks, timeLimitRemaining };
