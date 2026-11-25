import * as Game from "./game.js";
import { buildRuleSection, buildScheduleControls, scheduleShowsTimeOfDay } from "./app-form.js";
import { AppUI } from "./app-state.js";
import { CUSTOM_DAYS_OPTIONS, CUSTOM_HOURS_OPTIONS, CUSTOM_MINUTES_OPTIONS, DIFFICULTY_OPTIONS, LIST_OPTIONS, REPEAT_OPTIONS, TIME_LIMIT_OPTIONS, buildSelect, createDueAtWheels, createFieldToggle, createWheel, labeledField, readScheduleValues, scheduleValuesFromTask } from "./app-util.js";
import { showToast } from "./app-ui.js";
import { render } from "./app-list.js";
import { ICONS } from "./game-icons.js";

const E = AppUI.edit;

// editing state lives in AppUI.edit (E)

function editingSubtaskOf(task) {
  if (E.subtaskKey == null || E.taskId != null) return null;
  const sep = E.subtaskKey.indexOf(":");
  const parentId = Number(E.subtaskKey.slice(0, sep));
  const subtaskId = Number(E.subtaskKey.slice(sep + 1));
  if (parentId !== task.id) return null;
  return task.subtasks.find((st) => st.id === subtaskId) || null;
}

function clearEditing() {
  E.taskId = null;
  E.subtaskKey = null;
  E.pending = null;
  E.active = null;
}

function editValues(input, controls) {
  return [input.value, ...controls.map((c) => c.value)];
}

function buildTitleInput(title) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "title-input";
  input.value = title;
  input.maxLength = 80;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (E.active) E.active.onSave(E.active.input.value);
    } else if (e.key === "Escape") {
      clearEditing();
      render();
    }
  });
  return input;
}

function buildEditControlsRow() {
  const row = document.createElement("div");
  row.className = "edit-controls";
  for (const control of E.active.controls) row.appendChild(control);
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save";
  save.addEventListener("click", () => E.active.onSave(E.active.input.value));
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    clearEditing();
    render();
  });
  row.appendChild(save);
  row.appendChild(cancel);
  return row;
}

function activateEdit(scope, input, controls, onSave) {
  E.active = { scope, input, controls, onSave, initial: editValues(input, controls) };
  E.pending = null;
}

function openSubtaskEdit(parent, subtask) {
  const diff = buildSelect(DIFFICULTY_OPTIONS, subtask.difficulty);
  clearEditing();
  E.subtaskKey = parent.id + ":" + subtask.id;
  E.pending = {
    kind: "subtask",
    controls: [diff],
    onSave: (title) => {
      clearEditing();
      Game.editSubtask(parent, subtask, title, diff.value);
    },
  };
  render();
}

let outsideEditDown = null;

const RATING_OPTIONS = [
  { label: ICONS.weary + " Harder", value: "harder" },
  { label: ICONS.okHand + " As expected", value: "ok" },
  { label: ICONS.smile + " Easier", value: "easier" },
];
const RATING_RING_RADIUS = 13;
const RATING_RING_CIRC = 2 * Math.PI * RATING_RING_RADIUS;

function buildRatingCloseButton(onClose) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rating-close";
  btn.setAttribute("aria-label", "Close");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.classList.add("rating-ring");
  const bar = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bar.setAttribute("cx", "16");
  bar.setAttribute("cy", "16");
  bar.setAttribute("r", String(RATING_RING_RADIUS));
  bar.classList.add("rating-ring-bar");
  bar.style.strokeDasharray = String(RATING_RING_CIRC);
  svg.append(bar);
  const x = document.createElement("span");
  x.className = "rating-close-x";
  x.textContent = ICONS.times;
  btn.append(svg, x);
  btn.addEventListener("click", onClose);
  return { btn, bar };
}

function promptDifficultyRating(task) {
  if (task.repeat === "none") return;
  if (task.ratedDifficulty != null) return;
  const timeoutMs = Game.RATE_PROMPT_TIMEOUT;
  const panel = document.createElement("div");
  panel.className = "rating-panel";
  let dismissed = false;
  let timer = 0;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timer);
    panel.remove();
  };
  const q = document.createElement("span");
  q.textContent = `"${task.title}" ${ICONS.emDash} how was it?`;
  panel.appendChild(q);
  for (const opt of RATING_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      task.ratedDifficulty = opt.value;
      const origin = Confetti.originOf(btn); // capture before dismiss() removes the panel
      dismiss();
      const bonus = Game.awardRatingBonus(task);
      if (bonus) {
        Confetti.burstAt(origin, 18, { sizePx: 4, colors: ["#f2a900", "#f7c04a", "#ffe9a8"], vyMin: -70, vyMax: 60, lifetimeMs: 900 });
        RewardFlight.flyRewards(
          { x: origin.x + origin.width / 2, y: origin.y },
          bonus.coins,
          bonus.gems,
          AppUI.els.coinBalanceEl,
          AppUI.els.gemBalanceEl || AppUI.els.coinBalanceEl,
          { perCoin: true }
        );
        const parts = [];
        if (bonus.coins > 0) parts.push(`+${bonus.coins} ${ICONS.coin}`);
        if (bonus.gems > 0) parts.push(`+${bonus.gems} ${ICONS.gem}`);
        showToast(`${ICONS.sparkles} Rating bonus (10%): ${parts.join(" ")}`);
      }
      Game.saveState();
      render();
    });
    panel.appendChild(btn);
  }
  const { btn: closeBtn, bar } = buildRatingCloseButton(dismiss);
  panel.appendChild(closeBtn);
  document.body.appendChild(panel);
  timer = setTimeout(dismiss, timeoutMs);
  bar.style.transition = `stroke-dashoffset ${timeoutMs}ms linear`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.strokeDashoffset = String(RATING_RING_CIRC);
  }));
}

function buildEditSelectors(task, listSel, diff, rep, scheduleArea, timeLimit) {
  const selectors = document.createElement("div");
  selectors.className = "edit-selectors";
  const mainRow = document.createElement("div");
  mainRow.className = "edit-selectors-row";
  mainRow.appendChild(labeledField("Type", [listSel.el]));
  mainRow.appendChild(labeledField("Difficulty", [diff.el]));
  mainRow.appendChild(labeledField("Repeat", [rep.el]));
  const timeRow = document.createElement("div");
  timeRow.className = "edit-selectors-row";
  timeRow.appendChild(scheduleArea.deadlineSlot);
  const timeLimitRow = document.createElement("div");
  timeLimitRow.className = "edit-selectors-row";
  timeLimitRow.appendChild(labeledField(ICONS.timeLimit + " Time limit", [timeLimit.el]));
  selectors.appendChild(mainRow);
  selectors.appendChild(scheduleArea.scheduleWrap);
  selectors.appendChild(timeRow);
  if (scheduleArea.resetSection) selectors.appendChild(scheduleArea.resetSection.el);
  if (scheduleArea.ignoreSection) selectors.appendChild(scheduleArea.ignoreSection.el);
  selectors.appendChild(timeLimitRow);
  return selectors;
}

function syncDeadlineSlot(scheduleArea) {
  const slot = scheduleArea.deadlineSlot;
  slot.innerHTML = "";
  const dl = scheduleArea.schedule && scheduleArea.schedule.el
    ? scheduleArea.schedule.el.querySelector(".deadline-field")
    : null;
  if (dl) {
    slot.appendChild(dl);
    slot.classList.remove("hidden");
  } else {
    slot.classList.add("hidden");
  }
}

function buildDeadlineOffsetWheels(wrap, rule) {
  wrap.innerHTML = "";
  const ms = rule && rule.kind === "offset" ? rule.ms : 86400000;
  const days = createWheel(CUSTOM_DAYS_OPTIONS, Math.floor(ms / 86400000), "Days", null, true);
  const hours = createWheel(CUSTOM_HOURS_OPTIONS, Math.floor((ms % 86400000) / 3600000), "Hours", null, true);
  const mins = createWheel(CUSTOM_MINUTES_OPTIONS, Math.floor((ms % 3600000) / 60000), "Minutes", null, true);
  wrap.appendChild(days.el);
  wrap.appendChild(hours.el);
  wrap.appendChild(mins.el);
  wrap.readOffsetMs = () =>
    (Number(days.value) * 86400 + Number(hours.value) * 3600 + Number(mins.value) * 60) * 1000;
}

// For weekly tasks the deadline toggle hides/shows the deadline wheels;
// the kind button switches between fixed day/time and after-completion offset.
function syncWeeklyWheels(scheduleArea) {
  const repeat = scheduleArea.repeat;
  const ruleRepeat = repeat === "weekly" || repeat === "monthly";
  if (scheduleArea.deadlineBtnRow) {
    scheduleArea.deadlineBtnRow.classList.toggle("hidden", !ruleRepeat);
  }
  if (scheduleArea.resetSection) {
    scheduleArea.resetSection.el.classList.toggle("hidden", !ruleRepeat);
    scheduleArea.resetSection.setFixedMode(repeat === "monthly" ? "monthly" : "weekly");
  }
  if (scheduleArea.ignoreSection) scheduleArea.ignoreSection.el.classList.toggle("hidden", repeat !== "weekly");
  if (!ruleRepeat) return;
  const show = scheduleArea.deadlineEnabled;
  const offset = scheduleArea.deadlineKind === "offset";
  if (scheduleArea.schedule) scheduleArea.schedule.el.classList.toggle("hidden", !show || offset);
  if (scheduleArea.dueAtField) scheduleArea.dueAtField.classList.toggle("hidden", !show || offset);
  if (scheduleArea.deadlineOffsetWrap) scheduleArea.deadlineOffsetWrap.classList.toggle("hidden", !show || !offset);
}

function buildEditScheduleArea(task) {
  const scheduleValues = scheduleValuesFromTask(task);
  const scheduleWrap = document.createElement("div");
  scheduleWrap.className = "repeat-schedule edit-schedule";
  const deadlineSlot = document.createElement("div");
  deadlineSlot.className = "labeled-field deadline-slot hidden";
  const state = { scheduleValues, scheduleWrap, schedule: null, dueAt: null, dueAtWheelsWrap: null, dueAtField: null, deadlineSlot, deadlineEnabled: task.deadlineEnabled !== false, endOfDayBtn: document.createElement("button"), deadlineToggle: null, deadlineKindBtn: null, deadlineBtnRow: null, deadlineOffsetWrap: null, deadlineKind: "fixed", repeat: task.repeat, resetSection: null, ignoreSection: null };
  state.schedule = buildScheduleControls(task.repeat, scheduleValues, true);
  scheduleWrap.appendChild(state.schedule.el);
  state.deadlineKind = task.deadlineRule && task.deadlineRule.kind === "offset" ? "offset" : "fixed";
  state.deadlineToggle = createFieldToggle(state.deadlineEnabled, (on) => setDeadlineEnabled(on), ICONS.calendar + " Deadline", "Show/hide the deadline wheels");
  state.deadlineKindBtn = createFieldToggle(state.deadlineKind === "offset", (on) => {
    state.deadlineKind = on ? "offset" : "fixed";
    if (state.resetSection) {
      if (on) state.resetSection.setKind("offset");
      state.resetSection.setKindEnabled(!on);
    }
    state.deadlineKindBtn.textContent = on ? ICONS.hourglass + " After completion" : ICONS.calendar + " Fixed day + time";
    syncWeeklyWheels(state);
  }, state.deadlineKind === "offset" ? ICONS.hourglass + " After completion" : ICONS.calendar + " Fixed day + time", "Switch deadline between fixed day/time and time after completion");
  state.deadlineBtnRow = document.createElement("div");
  state.deadlineBtnRow.className = "deadline-btn-row";
  state.deadlineBtnRow.appendChild(state.deadlineToggle);
  state.deadlineBtnRow.appendChild(state.deadlineKindBtn);
  scheduleWrap.insertBefore(state.deadlineBtnRow, state.schedule.el);
  state.deadlineOffsetWrap = document.createElement("div");
  state.deadlineOffsetWrap.className = "deadline-offset-wheels";
  scheduleWrap.appendChild(state.deadlineOffsetWrap);
  buildDeadlineOffsetWheels(state.deadlineOffsetWrap, task.deadlineRule);
  state.resetSection = buildRuleSection({ label: ICONS.repeat + " Reset", rule: task.resetRule, enabled: task.resetRule != null, compact: true, fixedMode: task.repeat === "monthly" ? "monthly" : "weekly" });
  state.ignoreSection = buildRuleSection({ label: ICONS.noEntry + " Ignore", rule: task.ignoreRule, enabled: task.ignoreRule != null, compact: true, allowOffset: false });
  if (state.deadlineKind === "offset") {
    state.resetSection.setKind("offset");
    state.resetSection.setKindEnabled(false);
  }
  syncDeadlineSlot(state);
  state.dueAtWheelsWrap = document.createElement("div");
  state.dueAtWheelsWrap.className = "due-at-wheels";
  state.dueAtField = labeledField(ICONS.clock + " Time", [state.dueAtWheelsWrap], true, state.endOfDayBtn);
  scheduleWrap.appendChild(state.dueAtField);

  function setDeadlineEnabled(on) {
    state.deadlineEnabled = on;
    state.deadlineToggle.classList.toggle("on", on);
    state.deadlineToggle.setAttribute("aria-pressed", String(on));
    syncWeeklyWheels(state);
    syncEditDueAtLabel(state);
  }
  // Clicking anywhere in the deadline card activates the deadline (never
  // deactivates); clicks on interactive controls are ignored here.
  scheduleWrap.addEventListener("click", (ev) => {
    if (state.deadlineEnabled) return;
    if (ev.target.closest("button, .wheel-select, input, select, textarea, label, a")) return;
    setDeadlineEnabled(true);
  });
  return state;
}

function refreshEditSchedule(task, edit) {
  const { listSel, rep, scheduleArea } = edit;
  const repeat = listSel.value === "fun" ? "none" : rep.value;
  scheduleArea.repeat = repeat;
  if (scheduleArea.dueAt) scheduleArea.scheduleValues.repeatTime = scheduleArea.dueAt.read();
  Object.assign(scheduleArea.scheduleValues, readScheduleValues(scheduleArea.schedule.read));
  scheduleArea.scheduleWrap.innerHTML = "";
  scheduleArea.schedule = buildScheduleControls(repeat, scheduleArea.scheduleValues, true);
  if (scheduleArea.deadlineBtnRow) scheduleArea.scheduleWrap.appendChild(scheduleArea.deadlineBtnRow);
  scheduleArea.scheduleWrap.appendChild(scheduleArea.schedule.el);
  if (scheduleArea.deadlineOffsetWrap) {
    scheduleArea.scheduleWrap.appendChild(scheduleArea.deadlineOffsetWrap);
    buildDeadlineOffsetWheels(scheduleArea.deadlineOffsetWrap, null);
  }
  scheduleArea.scheduleWrap.appendChild(scheduleArea.dueAtField);
  syncDeadlineSlot(scheduleArea);
  scheduleArea.scheduleWrap.classList.toggle("hidden", scheduleArea.schedule.el.childElementCount === 0);
  const showDueAt = scheduleShowsTimeOfDay(repeat);
  scheduleArea.dueAtWheelsWrap.innerHTML = "";
  if (showDueAt) {
    scheduleArea.dueAt = createDueAtWheels(scheduleArea.scheduleValues.repeatTime, true);
    for (const el of scheduleArea.dueAt.els) scheduleArea.dueAtWheelsWrap.appendChild(el);
    const labelRow = scheduleArea.dueAtField.querySelector(".field-label-row");
    labelRow.querySelectorAll(".field-toggle-btn").forEach((b) => b.remove());
    if (repeat !== "weekly" && repeat !== "monthly") {
      const toggle = createFieldToggle(scheduleArea.deadlineEnabled, (on) => {
        scheduleArea.deadlineEnabled = on;
        syncEditDueAtLabel(scheduleArea);
      }, "Deadline", "Toggle deadline urgency");
      labelRow.insertBefore(toggle, scheduleArea.endOfDayBtn);
    }
    scheduleArea.endOfDayBtn.replaceWith(scheduleArea.dueAt.endOfDayBtn);
    scheduleArea.endOfDayBtn = scheduleArea.dueAt.endOfDayBtn;
  } else {
    scheduleArea.dueAt = null;
  }
  scheduleArea.dueAtField.classList.toggle("hidden", !showDueAt);
  syncEditDueAtLabel(scheduleArea);
  syncWeeklyWheels(scheduleArea);
}

function syncEditDueAtLabel(scheduleArea) {
  const label = scheduleArea.dueAtField.querySelector(".field-label");
  if (label) {
    label.textContent = ICONS.clock + " Time";
  }
}

function updateEditWheelsEnabled(task, edit) {
  const isFun = edit.listSel.value === "fun" || edit.listSel.value === "group";
  edit.diff.disabled = isFun || task.subtasks.length > 0;
  edit.rep.disabled = isFun;
  edit.diff.el.title = task.subtasks.length > 0
    ? "Difficulty is derived from the most difficult sub-task"
    : "";
  edit.rep.el.title = isFun ? (edit.listSel.value === "group" ? "Groups never repeat" : "Fun tasks never repeat") : "";
}

function saveEditRow(task, edit) {
  const { listSel, rep, diff, timeLimit, scheduleArea } = edit;
  const isFun = listSel.value === "fun" || listSel.value === "group";
  const repeat = isFun ? "none" : rep.value;
  const updates = {
    title: edit.titleInput.value,
    repeat,
    list: listSel.value,
    timeLimit: Number(timeLimit.value),
    ...readScheduleValues(scheduleArea.schedule.read),
  };
  if (scheduleArea.dueAt) {
    updates.repeatTime = scheduleArea.dueAt.read();
    updates.deadlineEnabled = scheduleArea.deadlineEnabled;
  }
  if (repeat === "weekly" || repeat === "monthly") {
    // Toggle off = no deadline. Otherwise the deadline is either a fixed
    // day+time (weekdays for weekly, nth weekday of month for monthly) or a
    // days/hours/minutes offset after completion.
    if (!scheduleArea.deadlineEnabled) {
      updates.deadlineRule = null;
    } else if (scheduleArea.deadlineKind === "offset" && scheduleArea.deadlineOffsetWrap.readOffsetMs) {
      const ms = scheduleArea.deadlineOffsetWrap.readOffsetMs();
      updates.deadlineRule = ms > 0 ? { kind: "offset", ms } : null;
    } else if (scheduleArea.dueAt) {
      const sched = readScheduleValues(scheduleArea.schedule.read);
      const minutes = scheduleArea.dueAt.read();
      const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mm = String(minutes % 60).padStart(2, "0");
      if (repeat === "monthly") {
        if (sched.repeatMonthlyWeekday !== null && sched.repeatMonthlyWeekday !== undefined) {
          updates.deadlineRule = { kind: "monthly", weekday: sched.repeatMonthlyWeekday, first: sched.repeatMonthlyFirst !== false, time: `${hh}:${mm}` };
        } else {
          updates.deadlineRule = null;
        }
      } else {
        const weekdays = sched.repeatWeekdays || [1];
        updates.deadlineRule = { kind: "fixed", slots: weekdays.map((weekday) => ({ weekday, time: `${hh}:${mm}` })) };
      }
    }
    if (scheduleArea.resetSection) updates.resetRule = scheduleArea.resetSection.read();
    if (repeat === "weekly" && scheduleArea.ignoreSection) updates.ignoreRule = scheduleArea.ignoreSection.read();
  }
  if (!isFun) updates.difficulty = diff.value;
  clearEditing();
  Game.editTask(task.id, updates);
}

function openEditRow(task) {
  clearEditing();
  E.taskId = task.id;

  if (task.list === "group") {
    // Groups only get the name edit; a group always stays a group.
    E.pending = {
      kind: "task",
      controls: [],
      onSave: (title) => {
        clearEditing();
        Game.editTask(task.id, { title });
      },
    };
    render();
    return;
  }

  const edit = {
    listSel: createWheel(LIST_OPTIONS, task.list || "todo", "List", null, true),
    diff: createWheel(DIFFICULTY_OPTIONS, task.difficulty ?? "easy", "Difficulty", null, true),
    rep: createWheel(REPEAT_OPTIONS, task.repeat, "Repeat", null, true),
    timeLimit: createWheel(TIME_LIMIT_OPTIONS, task.timeLimit || 0, "Time limit", null, true),
    scheduleArea: null,
    titleInput: null,
  };
  edit.rep.el.title = task.list === "fun" ? "Fun tasks never repeat" : "";
  const onChange = () => {
    updateEditWheelsEnabled(task, edit);
    refreshEditSchedule(task, edit);
  };
  edit.listSel = createWheel(LIST_OPTIONS, task.list || "todo", "List", onChange, true);
  edit.rep = createWheel(REPEAT_OPTIONS, task.repeat, "Repeat", onChange, true);
  edit.scheduleArea = buildEditScheduleArea(task);

  const selectors = buildEditSelectors(task, edit.listSel, edit.diff, edit.rep, edit.scheduleArea, edit.timeLimit);

  updateEditWheelsEnabled(task, edit);
  refreshEditSchedule(task, edit);

  E.pending = {
    kind: "task",
    controls: [selectors],
    onSave: (title) => {
      edit.titleInput = { value: title };
      saveEditRow(task, edit);
    },
  };
  render();
}

export { RATING_OPTIONS, activateEdit, buildEditControlsRow, buildEditScheduleArea, buildEditSelectors, buildTitleInput, clearEditing, editValues, editingSubtaskOf, openEditRow, openSubtaskEdit, outsideEditDown, promptDifficultyRating, refreshEditSchedule, saveEditRow, syncDeadlineSlot, updateEditWheelsEnabled  };
