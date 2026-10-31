import * as Game from "./game.js";
import { buildScheduleControls, scheduleShowsTimeOfDay } from "./app-form.js";
import { AppUI } from "./app-state.js";
import { DIFFICULTY_OPTIONS, LIST_OPTIONS, REPEAT_OPTIONS, TIME_LIMIT_OPTIONS, buildSelect, createDueAtWheels, createWheel, labeledField, readScheduleValues, scheduleValuesFromTask } from "./app-util.js";
import { showToast } from "./app-ui.js";
import { render } from "./app-list.js";

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
      Game.saveState();
      render();
    });
    panel.appendChild(btn);
  }
  document.body.appendChild(panel);
  setTimeout(() => panel.remove(), Game.RATE_PROMPT_TIMEOUT);
}

function buildEditSelectors(task, listSel, diff, rep) {
  const selectors = document.createElement("div");
  selectors.className = "edit-selectors form-row-labeled";
  selectors.appendChild(labeledField("Type", [listSel.el]));
  selectors.appendChild(labeledField("Difficulty", [diff.el]));
  selectors.appendChild(labeledField("Repeat", [rep.el]));
  return selectors;
}

function buildEditScheduleArea(task) {
  const scheduleValues = scheduleValuesFromTask(task);
  const scheduleWrap = document.createElement("div");
  scheduleWrap.className = "repeat-schedule edit-schedule";
  const state = { scheduleValues, scheduleWrap, schedule: null, dueAt: null, dueAtWheelsWrap: null, dueAtField: null };
  state.schedule = buildScheduleControls(task.repeat, scheduleValues, true);
  scheduleWrap.appendChild(state.schedule.el);
  state.dueAtWheelsWrap = document.createElement("div");
  state.dueAtWheelsWrap.className = "due-at-wheels";
  state.dueAtField = labeledField("\ud83d\udd54 Due at", [state.dueAtWheelsWrap], true);
  return state;
}

function refreshEditSchedule(task, edit) {
  const { listSel, rep, scheduleArea } = edit;
  const repeat = listSel.value === "fun" ? "none" : rep.value;
  if (scheduleArea.dueAt) scheduleArea.scheduleValues.repeatTime = scheduleArea.dueAt.read();
  Object.assign(scheduleArea.scheduleValues, readScheduleValues(scheduleArea.schedule.read));
  scheduleArea.scheduleWrap.innerHTML = "";
  scheduleArea.schedule = buildScheduleControls(repeat, scheduleArea.scheduleValues, true);
  scheduleArea.scheduleWrap.appendChild(scheduleArea.schedule.el);
  scheduleArea.scheduleWrap.classList.toggle("hidden", scheduleArea.schedule.el.childElementCount === 0);
  const showDueAt = scheduleShowsTimeOfDay(repeat);
  scheduleArea.dueAtWheelsWrap.innerHTML = "";
  if (showDueAt) {
    scheduleArea.dueAt = createDueAtWheels(scheduleArea.scheduleValues.repeatTime, true);
    for (const el of scheduleArea.dueAt.els) scheduleArea.dueAtWheelsWrap.appendChild(el);
  } else {
    scheduleArea.dueAt = null;
  }
  scheduleArea.dueAtField.classList.toggle("hidden", !showDueAt);
}

function updateEditWheelsEnabled(task, edit) {
  const isFun = edit.listSel.value === "fun";
  edit.diff.disabled = isFun || task.subtasks.length > 0;
  edit.rep.disabled = isFun;
  edit.diff.el.title = task.subtasks.length > 0
    ? "Difficulty is derived from the most difficult sub-task"
    : "";
  edit.rep.el.title = isFun ? "Fun tasks never repeat" : "";
}

function buildEditBottomRow(scheduleArea, timeLimit) {
  const timeLimitField = labeledField("\u23f1\ufe0f Time limit", [timeLimit.el]);
  const bottomRow = document.createElement("div");
  bottomRow.className = "form-row form-row-labeled edit-bottom-row";
  bottomRow.appendChild(scheduleArea.dueAtField);
  bottomRow.appendChild(timeLimitField);
  return bottomRow;
}

function saveEditRow(task, edit) {
  const { listSel, rep, diff, timeLimit, scheduleArea } = edit;
  const isFun = listSel.value === "fun";
  const repeat = isFun ? "none" : rep.value;
  const updates = {
    title: edit.titleInput.value,
    repeat,
    list: listSel.value,
    timeLimit: Number(timeLimit.value),
    ...readScheduleValues(scheduleArea.schedule.read),
  };
  if (scheduleArea.dueAt) updates.repeatTime = scheduleArea.dueAt.read();
  if (!isFun) updates.difficulty = diff.value;
  clearEditing();
  Game.editTask(task.id, updates);
}

function openEditRow(task) {
  clearEditing();
  E.taskId = task.id;

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

  const selectors = buildEditSelectors(task, edit.listSel, edit.diff, edit.rep);
  const bottomRow = buildEditBottomRow(edit.scheduleArea, edit.timeLimit);

  updateEditWheelsEnabled(task, edit);
  refreshEditSchedule(task, edit);

  E.pending = {
    kind: "task",
    controls: [selectors, edit.scheduleArea.scheduleWrap, bottomRow],
    onSave: (title) => {
      edit.titleInput = { value: title };
      saveEditRow(task, edit);
    },
  };
  render();
}

export { RATING_OPTIONS, activateEdit, buildEditBottomRow, buildEditControlsRow, buildEditScheduleArea, buildEditSelectors, buildTitleInput, clearEditing, editValues, editingSubtaskOf, openEditRow, openSubtaskEdit, outsideEditDown, promptDifficultyRating, refreshEditSchedule, saveEditRow, updateEditWheelsEnabled  };
