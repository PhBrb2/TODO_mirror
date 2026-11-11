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

function createFieldToggle(enabled, onChange, label, title) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "field-toggle-btn" + (enabled ? " on" : "");
  btn.textContent = label;
  btn.title = title;
  btn.setAttribute("aria-pressed", String(enabled));
  btn.addEventListener("click", () => {
    const on = !btn.classList.contains("on");
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
    onChange(on);
  });
  return btn;
}

function formatResetIn(ts) {
  const mins = Math.max(0, Math.round((ts - Date.now()) / 60000));
  let tstr;
  if (mins < 60) tstr = `${mins}m`;
  else if (mins < 1440) tstr = `${Math.round(mins / 60)}h`;
  else tstr = `${Math.round(mins / 1440)}d`;
  return `🔄 reset in ${tstr}`;
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
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
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

function chainLinkNode(className, onUnlink) {
  const row = document.createElement(className === "chain-link-row" ? "li" : "div");
  row.className = className;
  const unlink = document.createElement("button");
  unlink.type = "button";
  unlink.className = "chain-unlink";
  unlink.textContent = "🔗";
  unlink.title = "Chained \u2014 click to remove the link";
  unlink.addEventListener("click", onUnlink);
  row.appendChild(unlink);
  return row;
}

const CHAIN_VISIBLE_UNCHECKED = 2;

function isGlobalEditMode() {
  return !document.body.classList.contains("actions-hidden");
}

function chainVisibility(items, showAll, isExpanded = null) {
  const vis = new Map();
  for (const it of items) vis.set(it.id, { hidden: false, zigzagAbove: false, zigzagBelow: false });
  if (showAll) return vis;
  const byId = new Map(items.map((it) => [it.id, it]));
  const successors = new Map();
  const chained = new Set();
  for (const it of items) {
    if (!it.chainedAfter || !byId.has(it.chainedAfter)) continue;
    chained.add(it.id);
    if (!successors.has(it.chainedAfter)) successors.set(it.chainedAfter, []);
    successors.get(it.chainedAfter).push(it);
  }
  const inChain = (it) => chained.has(it.id) || (successors.get(it.id) || []).length > 0;
  const headOf = (item) => {
    let head = item;
    while (head.chainedAfter && byId.has(head.chainedAfter)) head = byId.get(head.chainedAfter);
    return head;
  };
  const heads = new Set();
  for (const it of items) if (inChain(it)) heads.add(headOf(it).id);
  for (const headId of heads) {
    if (isExpanded && isExpanded(headId)) continue;
    const component = [];
    const stack = [byId.get(headId)];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (seen.has(cur.id)) continue;
      seen.add(cur.id);
      component.push(cur);
      for (const s of successors.get(cur.id) || []) stack.push(s);
    }
    const split = component.some((it) => (successors.get(it.id) || []).length > 1);
    if (split) continue;
    let uncheckedRun = 0;
    let cur = byId.get(headId);
    while (cur) {
      const v = vis.get(cur.id);
      if (cur.done) {
        v.hidden = true;
        uncheckedRun = 0;
      } else {
        uncheckedRun += 1;
        if (uncheckedRun > CHAIN_VISIBLE_UNCHECKED) v.hidden = true;
      }
      const succ = successors.get(cur.id) || [];
      cur = succ.length === 1 ? succ[0] : null;
    }
  }
  for (const it of items) {
    const v = vis.get(it.id);
    if (v.hidden) continue;
    const pred = it.chainedAfter && byId.has(it.chainedAfter) ? byId.get(it.chainedAfter) : null;
    if (pred && vis.get(pred.id).hidden) v.zigzagAbove = true;
    for (const s of successors.get(it.id) || []) {
      if (vis.get(s.id).hidden) {
        v.zigzagBelow = true;
        break;
      }
    }
  }
  return vis;
}

const CHAIN_PALETTE = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

function chainColorInfo(items, startIndex = 0) {
  const byId = new Map(items.map((it) => [it.id, it]));
  const indexOf = new Map(items.map((it, i) => [it.id, i]));
  const successors = new Map();
  for (const it of items) {
    if (!it.chainedAfter || !byId.has(it.chainedAfter)) continue;
    if (!successors.has(it.chainedAfter)) successors.set(it.chainedAfter, []);
    successors.get(it.chainedAfter).push(it);
  }
  for (const list of successors.values()) list.sort((a, b) => indexOf.get(a.id) - indexOf.get(b.id));
  const branchDots = new Map();
  const splitDots = new Map();
  const assigned = new Set();
  let colorIndex = startIndex;
  for (const it of items) {
    const chained = Boolean(it.chainedAfter && byId.has(it.chainedAfter));
    if (!chained && !(successors.get(it.id) || []).length) continue;
    let head = it;
    while (head.chainedAfter && byId.has(head.chainedAfter)) head = byId.get(head.chainedAfter);
    if (assigned.has(head.id)) continue;
    assigned.add(head.id);
    const ordered = [];
    const emitted = new Set();
    const emit = (item) => {
      if (emitted.has(item.id)) return;
      emitted.add(item.id);
      ordered.push(item);
      for (const s of successors.get(item.id) || []) emit(s);
    };
    emit(head);
    for (const c of ordered) {
      const succ = successors.get(c.id) || [];
      if (succ.length > 1) {
        const color = CHAIN_PALETTE[colorIndex % CHAIN_PALETTE.length];
        colorIndex += 1;
        splitDots.set(c.id, color);
        for (const s of succ) branchDots.set(s.id, color);
      }
    }
  }
  return { branchDots, splitDots, nextIndex: colorIndex };
}

function buildChainColorInfo(tasks) {
  const taskLevel = chainColorInfo(tasks, 0);
  const subtasks = new Map();
  let nextIndex = taskLevel.nextIndex;
  for (const task of tasks) {
    if (!task.subtasks || task.subtasks.length === 0) continue;
    const info = chainColorInfo(task.subtasks, nextIndex);
    nextIndex = info.nextIndex;
    subtasks.set(task.id, { branchDots: info.branchDots, splitDots: info.splitDots });
  }
  return { branchDots: taskLevel.branchDots, splitDots: taskLevel.splitDots, subtasks };
}

function chainInlineSymbol(onUnlink) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chain-unlink chain-inline-symbol";
  btn.textContent = "\ud83d\udd17";
  btn.title = "Chained \u2014 click to remove the link";
  btn.addEventListener("click", onUnlink);
  return btn;
}

function chainDot(className, color) {
  const dot = document.createElement("span");
  dot.className = className;
  dot.style.background = color;
  return dot;
}

function zigzagSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "chain-zigzag");
  svg.setAttribute("viewBox", "0 0 60 8");
  svg.setAttribute("preserveAspectRatio", "none");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", "0,6 3.75,2 7.5,6 11.25,2 15,6 18.75,2 22.5,6 26.25,2 30,6 33.75,2 37.5,6 41.25,2 45,6 48.75,2 52.5,6 56.25,2 60,6");
  svg.appendChild(line);
  return svg;
}

function zigzagEdgeNode(above, onExpand = null) {
  const el = document.createElement("div");
  el.className = "chain-zigzag-edge " + (above ? "chain-zigzag-above" : "chain-zigzag-below") + (onExpand ? " expandable" : "");
  el.appendChild(zigzagSvg());
  if (onExpand) el.addEventListener("click", () => onExpand());
  return el;
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

export { CHAIN_PALETTE, CHAIN_VISIBLE_UNCHECKED, CUSTOM_DAYS_OPTIONS, DELETE_ARM_MS, CUSTOM_HOURS_OPTIONS, CUSTOM_MINUTES_OPTIONS, DIFFICULTY_OPTIONS, LIST_OPTIONS, REPEAT_OPTIONS, TIME_LIMIT_OPTIONS, TIME_OF_DAY_HOURS_OPTIONS, TIME_OF_DAY_MINUTES_OPTIONS, WEEKDAY_CHECKBOXES, armDeleteButton, buildChainColorInfo, buildSelect, chainColorInfo, chainDot, chainInlineSymbol, chainLinkNode, chainOrdered, chainVisibility, createDueAtWheels, createFieldToggle, createWheel, deadlineInputValue, formatDeadline, formatResetIn, formatMinutesSeconds, isGlobalEditMode, isRepeatingRepeat, labeledField, mountWheel, readScheduleValues, scheduleValuesFromTask, sortTasks, timeLimitRemaining, zigzagEdgeNode, zigzagSvg };
