import * as Game from "./game.js";
import { subtaskDraggable, taskDraggable } from "./app-drag.js";
import { activateEdit, buildEditControlsRow, buildTitleInput, clearEditing, editingSubtaskOf, openEditRow, openSubtaskEdit } from "./app-edit.js";
import { AppUI } from "./app-state.js";
import { renderBalances } from "./app-ui.js";
import { DELETE_ARM_MS, DIFFICULTY_OPTIONS, armDeleteButton, buildSelect, chainLinkNode, chainOrdered, formatDeadline, formatMinutesSeconds, sortTasks, timeLimitRemaining } from "./app-util.js";

const E = AppUI.edit;

async function deleteTaskWithConfirm(task) {
  const hasStreak = task.repeat !== "none" && task.streak > 0;
  const hasSubtasks = task.subtasks.length > 0;
  if (hasStreak || hasSubtasks) {
    const reasons = [];
    if (hasSubtasks) reasons.push(`${task.subtasks.length} subtask${task.subtasks.length === 1 ? "" : "s"}`);
    if (hasStreak) reasons.push(`a ${task.streak}-day streak`);
    const ok = await ConfirmDialog.confirm(
      `Delete "${task.title}"? It has ${reasons.join(" and ")}.`
    );
    if (!ok) return;
  }
  Game.deleteTask(task.id);
}

function taskCheckbox(li, task) {
  const locked = !Game.chainSatisfiesDependency(task) && !task.done;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = task.done;
  cb.disabled = locked;
  if (locked) cb.title = "Complete the chained predecessor first";
  cb.addEventListener("change", () => {
    if (cb.checked) {
      const origin = Confetti.originOf(li);
      Game.completeTask(task);
      if (task.done) {
        Confetti.burstAt(origin, Game.CONFETTI_COUNT[task.difficulty] || 12);
        RewardFlight.flyRewards(
          { x: origin.x + origin.width / 2, y: origin.y },
          task.reward.coins,
          task.reward.gems,
          AppUI.els.coinBalanceEl,
          AppUI.els.gemBalanceEl
        );
      }
    } else {
      Game.uncompleteTask(task);
    }
  });
  return cb;
}

function taskTitleNode(task, editingThisTask) {
  if (!editingThisTask) {
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    return { node: title, input: null };
  }
  const input = buildTitleInput(task.title);
  const title = document.createElement("div");
  title.className = "task-title editing";
  title.appendChild(input);
  return { node: title, input };
}

function taskMetaNode(task) {
  const meta = document.createElement("div");
  meta.className = "task-meta";
  if (task.repeat !== "none") {
    const rep = document.createElement("span");
    rep.className = "badge repeat";
    rep.textContent = "\ud83d\udd01 " + (task.repeat === "every_5min" ? "5 min" : task.repeat);
    meta.appendChild(rep);
    if (task.streak > 0) {
      const st = document.createElement("span");
      st.className = "badge streak";
      st.textContent = "\ud83d\udd25 " + task.streak;
      meta.appendChild(st);
    }
  }
  if (task.deadline && !task.done) {
    const dl = document.createElement("span");
    dl.className = "badge deadline" + (task.deadline < Date.now() ? " overdue" : "");
    dl.dataset.taskId = task.id;
    dl.textContent = formatDeadline(task.deadline);
    meta.appendChild(dl);
  }
  if (task.timeLimit && !task.done) {
    meta.appendChild(taskTimeBadge(task));
  }
  return meta;
}

function taskTimeBadge(task) {
  if (task.startedAt) {
    const tl = document.createElement("span");
    tl.className = "badge timer running";
    tl.dataset.taskId = task.id;
    tl.textContent = `\u23f1\ufe0f ${formatMinutesSeconds(Math.max(0, timeLimitRemaining(task, Date.now())))}`;
    return tl;
  }
  const tl = document.createElement("span");
  tl.className = "badge timer";
  tl.textContent = `\u23f1\ufe0f ${task.timeLimit}m`;
  return tl;
}

function subtaskCheckbox(row, task, st, stLocked, parentLocked) {
  const scb = document.createElement("input");
  scb.type = "checkbox";
  scb.checked = st.done;
  scb.disabled = stLocked;
  if (stLocked) {
    scb.title = parentLocked
      ? "Finish the chained predecessor task first"
      : "Complete the chained predecessor first";
  }
  scb.addEventListener("change", () => {
    const origin = Confetti.originOf(row);
    Game.toggleSubtask(task, st);
    if (st.done) {
      Confetti.burstAt(origin, Math.ceil((Game.CONFETTI_COUNT[st.difficulty] || 12) / 2));
      RewardFlight.flyRewards(
        { x: origin.x + origin.width / 2, y: origin.y },
        st.reward ? st.reward.coins : 0,
        st.reward ? st.reward.gems : 0,
        AppUI.els.coinBalanceEl,
        AppUI.els.gemBalanceEl
      );
    }
  });
  return scb;
}

function subtaskRow(task, st, parentLocked) {
  const row = document.createElement("div");
  row.className = "subtask subtask-row-" + st.id + (st.done ? " done" : "");
  row.dataset.parentId = task.id;
  row.dataset.subtaskId = st.id;
  const stLocked = parentLocked || (!Game.subtaskChainSatisfies(task, st) && !st.done);
  const restoreSub = E.pending && E.pending.kind === "restore" && E.pending.subKey
    ? E.pending.subKey === task.id + ":" + st.id : false;
  const editingThisSub = restoreSub
    || (editingSubtaskOf(task) === st && E.pending && E.pending.kind === "subtask");
  const stTitle = editingThisSub ? buildTitleInput(st.title) : document.createElement("span");
  stTitle.className = editingThisSub ? "subtask-title title-input" : "subtask-title";
  if (!editingThisSub) stTitle.textContent = st.title;
  const stEdit = document.createElement("button");
  stEdit.className = "task-edit subtask-edit";
  stEdit.textContent = "\u270e";
  stEdit.addEventListener("click", () => openSubtaskEdit(task, st));
  const stBadge = document.createElement("span");
  stBadge.className = "subtask-difficulty-dot " + st.difficulty;
  stBadge.title = st.difficulty.replace("_", " ");
  const stDel = document.createElement("button");
  stDel.className = "task-delete subtask-delete";
  stDel.textContent = "\u2715";
  armDeleteButton(stDel, () => Game.deleteSubtask(task, st.id));
  subtaskDraggable(row, task, st);
  row.appendChild(subtaskCheckbox(row, task, st, stLocked, parentLocked));
  row.appendChild(stTitle);
  row.appendChild(stBadge);
  row.appendChild(stEdit);
  row.appendChild(stDel);
  return { row, editingThisSub, stTitle };
}

function subtaskAddRow(task) {
  const addRow = document.createElement("div");
  addRow.className = "subtask-add";
  const addInput = document.createElement("input");
  addInput.type = "text";
  addInput.placeholder = "Add subtask...";
  addInput.maxLength = 80;
  const addDiff = buildSelect(DIFFICULTY_OPTIONS);
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+";
  addBtn.title = "Add subtask";
  const addForm = document.createElement("div");
  addForm.className = "subtask-add-form hidden";
  addForm.appendChild(addInput);
  addForm.appendChild(addDiff);
  const submit = () => {
    const v = addInput.value.trim();
    if (v) Game.addSubtask(task.id, v, addDiff.value);
  };
  addBtn.addEventListener("click", () => {
    if (addForm.classList.contains("hidden")) {
      addForm.classList.remove("hidden");
      addInput.focus();
      return;
    }
    submit();
  });
  addInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      addForm.classList.add("hidden");
      addInput.blur();
    }
  });
  addForm.addEventListener("focusout", (e) => {
    if (!addRow.contains(e.relatedTarget)) addForm.classList.add("hidden");
  });
  addRow.appendChild(addBtn);
  addRow.appendChild(addForm);
  return addRow;
}

function subtaskListNode(task, li) {
  const parentLocked = Game.subtasksLockedByChain(task);
  if (task.subtasks.length === 0 && task.done) return null;
  const sublist = document.createElement("div");
  sublist.className = "subtask-list" + (parentLocked ? " chain-locked" : "");
  let prevSub = null;
  for (const st of chainOrdered(task.subtasks)) {
    if (st.chainedAfter) {
      const adjacent = prevSub && prevSub.id === st.chainedAfter;
      sublist.appendChild(chainLinkNode("subtask-link-row", () => Game.unchainSubtask(task, st), { withLine: adjacent }));
    }
    const { row, editingThisSub, stTitle } = subtaskRow(task, st, parentLocked);
    sublist.appendChild(row);
    prevSub = st;
    if (editingThisSub) {
      activateEdit(li, stTitle, E.pending.controls, E.pending.onSave);
      sublist.insertBefore(buildEditControlsRow(), row.nextSibling);
    }
  }
  if (!task.done) sublist.appendChild(subtaskAddRow(task));
  return sublist;
}

function taskActionsNode(task) {
  const del = document.createElement("button");
  del.className = "task-delete";
  del.textContent = "\u2715";
  armDeleteButton(del, () => deleteTaskWithConfirm(task));

  const edit = document.createElement("button");
  edit.className = "task-edit";
  edit.textContent = "\u270e";
  edit.addEventListener("click", () => openEditRow(task));

  const actions = document.createElement("div");
  const editingThis = E.taskId === task.id || editingSubtaskOf(task);
  actions.className = "task-actions" + (editingThis ? " hidden" : "");
  actions.appendChild(edit);
  actions.appendChild(del);

  if (task.timeLimit && !task.done && timeLimitRemaining(task, Date.now()) <= 0) {
    const start = document.createElement("button");
    start.className = "task-start";
    start.type = "button";
    start.textContent = "\u25b6 Start";
    start.title = `Finish within ${task.timeLimit} min for a bonus`;
    start.addEventListener("click", () => Game.startTask(task));
    actions.appendChild(start);
  }
  return actions;
}

function taskNode(task) {
  const li = document.createElement("li");
  li.className = "task diff-" + (task.difficulty || "fun") + (task.done ? " done" : "");
  li.dataset.id = task.id;
  li.title = task.list === "fun" ? "Fun task" : "Difficulty: " + task.difficulty.replace("_", " ");

  const editingThisTask = E.taskId === task.id && E.pending && E.pending.kind === "task"
    || (E.pending && E.pending.kind === "restore" && E.pending.taskId === task.id);

  const body = document.createElement("div");
  body.className = "task-body";
  const { node: title, input: titleInput } = taskTitleNode(task, editingThisTask);
  body.appendChild(title);
  body.appendChild(taskMetaNode(task));
  if (editingThisTask) {
    activateEdit(li, titleInput, E.pending.controls, E.pending.onSave);
    body.appendChild(buildEditControlsRow());
  }
  const sublist = subtaskListNode(task, li);
  if (sublist) body.appendChild(sublist);

  taskDraggable(li, task);

  li.appendChild(taskCheckbox(li, task));
  li.appendChild(body);
  li.appendChild(taskActionsNode(task));
  return li;
}

function tasksForTab() {
  if (AppUI.activeTab === "highlight") return Game.highlightTasks();
  return Game.state.tasks.filter((t) => (t.list || "todo") === AppUI.activeTab);
}

let render = function () {
  const visible = tasksForTab();
  const sorted = chainOrdered(visible, sortTasks(visible));
  const openEdit = E.active && E.active.scope.isConnected ? E.active : null;
  if (openEdit) {
    E.pending = { kind: "restore", taskId: E.taskId, subKey: E.subtaskKey, controls: openEdit.controls, onSave: openEdit.onSave };
    E.taskId = null;
    E.subtaskKey = null;
    E.active = null;
  }
  AppUI.els.listEl.innerHTML = "";
  if (E.active && !E.active.scope.isConnected) clearEditing();
  let prevTask = null;
  for (const task of sorted) {
    if (task.chainedAfter) {
      const adjacent = prevTask && prevTask.id === task.chainedAfter;
      AppUI.els.listEl.appendChild(chainLinkNode("chain-link-row", () => Game.unchainTask(task), { withLine: adjacent }));
    }
    const node = taskNode(task);
    AppUI.els.listEl.appendChild(node);
    prevTask = task;
  }

  AppUI.els.listEl.classList.toggle("editing", E.taskId !== null || E.subtaskKey !== null);
  AppUI.els.emptyHint.classList.toggle("hidden", visible.length > 0);
  AppUI.els.emptyHint.textContent = AppUI.activeTab === "highlight"
    ? "Nothing to highlight — complete tasks to earn recommendations! 🎉"
    : "Nothing to do yet — add a task! 🎉";
  renderBalances();

  const lastGoal = Game.DAILY_GOALS[Game.DAILY_GOALS.length - 1];
  const reached = Game.reachedGoalCount(Game.state.dailyCompleted);
  const nextGoal = Game.DAILY_GOALS[reached] || lastGoal;
  const label =
    reached >= Game.DAILY_GOALS.length
      ? `${Game.state.dailyCompleted} ✅ all goals done`
      : `${Game.state.dailyCompleted}/${nextGoal}`;
  AppUI.els.dailyProgressEl.textContent = label;

  const pct = Math.min(100, (Game.state.dailyCompleted / nextGoal) * 100);

  AppUI.els.dailyBar.innerHTML = "";
  const fill = document.createElement("div");
  fill.className = "daily-bar-fill";
  fill.style.width = pct + "%";
  AppUI.els.dailyBar.appendChild(fill);

  const lastWeekly = Game.WEEKLY_GOALS[Game.WEEKLY_GOALS.length - 1];
  const weekReached = Game.reachedWeeklyGoalCount(Game.state.weeklyCompleted);
  const nextWeekly = Game.WEEKLY_GOALS[weekReached] || lastWeekly;
  AppUI.els.weeklyProgressEl.textContent =
    weekReached >= Game.WEEKLY_GOALS.length
      ? `${Game.state.weeklyCompleted} ✅`
      : `${Game.state.weeklyCompleted}/${nextWeekly}`;
  AppUI.els.weeklyBar.innerHTML = "";
  const wFill = document.createElement("div");
  wFill.className = "daily-bar-fill";
  wFill.style.width = Math.min(100, (Game.state.weeklyCompleted / nextWeekly) * 100) + "%";
  AppUI.els.weeklyBar.appendChild(wFill);

  AppUI.els.levelDisplayEl.textContent = Game.levelFromXp(Game.state.xp);

  if (Game.isBoostActive()) {
    AppUI.els.boostBannerEl.classList.remove("hidden");
    const remaining = Math.max(0, Game.state.boostUntil - Date.now());
    AppUI.els.boostTimerEl.textContent = formatMinutesSeconds(remaining);
  } else {
    AppUI.els.boostBannerEl.classList.add("hidden");
  }
}

function updateLiveClocks() {
  const now = Date.now();
  if (Game.isBoostActive()) {
    AppUI.els.boostBannerEl.classList.remove("hidden");
    const remaining = Math.max(0, Game.state.boostUntil - now);
    AppUI.els.boostTimerEl.textContent = formatMinutesSeconds(remaining);
  } else {
    AppUI.els.boostBannerEl.classList.add("hidden");
  }

  for (const node of AppUI.els.listEl.querySelectorAll(".badge.deadline")) {
    const task = Game.state.tasks.find((t) => t.id === Number(node.dataset.taskId));
    if (!task || task.done) continue;
    node.textContent = formatDeadline(task.deadline);
    node.classList.toggle("overdue", task.deadline < Date.now());
  }

  for (const node of AppUI.els.listEl.querySelectorAll(".badge.timer.running")) {
    const task = Game.state.tasks.find((t) => t.id === Number(node.dataset.taskId));
    if (!task) continue;
    const remaining = timeLimitRemaining(task, now);
    node.textContent = `⏱️ ${formatMinutesSeconds(Math.max(0, remaining))}`;
    node.classList.toggle("overdue", remaining <= 0);
  }

}

export { deleteTaskWithConfirm, render, subtaskAddRow, subtaskCheckbox, subtaskListNode, subtaskRow, taskActionsNode, taskCheckbox, taskMetaNode, taskNode, taskTimeBadge, taskTitleNode, tasksForTab, updateLiveClocks  };
