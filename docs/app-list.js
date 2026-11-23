import * as Game from "./game.js";
import { subtaskDraggable, taskDraggable } from "./app-drag.js";
import { celebrateGoal } from "./goal-celebration.js";
import { activateEdit, buildEditControlsRow, buildTitleInput, clearEditing, editingSubtaskOf, openEditRow, openSubtaskEdit } from "./app-edit.js";
import { AppUI } from "./app-state.js";
import { renderBalances, vibrateForReward } from "./app-ui.js";
import { DELETE_ARM_MS, DIFFICULTY_OPTIONS, armDeleteButton, buildChainColorInfo, buildSelect, chainDot, chainInlineSymbol, chainLinkNode, chainOrdered, chainVisibility, formatDeadline, formatResetIn, formatMinutesSeconds, isGlobalEditMode, sortTasks, timeLimitRemaining, zigzagEdgeNode } from "./app-util.js";
import { ICONS } from "./game-icons.js";

const E = AppUI.edit;

async function deleteTaskWithConfirm(task) {
  const hasStreak = task.repeat !== "none" && task.streak > 0;
  const hasSubtasks = task.subtasks.length > 0;
  const memberCount = Game.state.tasks.filter((t) => t.groupId === task.id).length;
  const hasMembers = task.list === "group" && memberCount > 0;
  if (hasMembers) {
    const choice = await ConfirmDialog.choices(
      `Delete group "${task.title}"? It has ${memberCount} grouped task${memberCount === 1 ? "" : "s"}.`,
      [
        { label: "Cancel", value: null, className: "confirm-cancel", focus: true },
        { label: "Keep tasks", value: "keep", className: "confirm-btn" },
        { label: "Delete grouped tasks", value: "deleteAll", className: "confirm-ok" },
      ]
    );
    if (choice === "deleteAll") Game.deleteTask(task.id, { deleteMembers: true });
    else if (choice === "keep") Game.deleteTask(task.id);
    return;
  }
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
        vibrateForReward(task.reward);
      }
    } else {
      Game.uncompleteTask(task);
    }
  });
  return cb;
}

// Green fill that rises from the bottom of the parent checkbox as
// subtasks are completed (only for tasks with more than 2 subtasks).
function buildSubtaskFill(task) {
  const n = task.subtasks.length;
  if (n <= 2 || task.done) return null;
  const done = task.subtasks.filter((s) => s.done).length;
  const fill = document.createElement("div");
  fill.className = "task-check-fill";
  fill.style.height = `${(done / n) * 100}%`;
  return fill;
}

function taskTitleNode(task, editingThisTask, chainInfo = null) {
  if (!editingThisTask) {
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;
    if (chainInfo && chainInfo.splitDots.has(task.id)) {
      title.appendChild(chainDot("chain-split-dot", chainInfo.splitDots.get(task.id)));
    }
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
  if (task.pinned) {
    const pin = document.createElement("span");
    pin.className = "badge pinned";
    pin.textContent = ICONS.pin + " pinned";
    meta.appendChild(pin);
  }
  if (task.repeat !== "none") {
    const rep = document.createElement("span");
    rep.className = "badge repeat";
    rep.textContent = ICONS.repeat + " " + task.repeat;
    if (task.repeat === "manual") {
      rep.classList.add("task-enable");
      rep.role = "button";
      rep.tabIndex = 0;
      rep.title = "Manually enable this task";
      rep.addEventListener("click", () => {
        if (task.done) Game.enableTask(task);
        else Game.emitToast(ICONS.check + " \"" + task.title + "\" is already enabled");
      });
    }
    meta.appendChild(rep);
    if (task.streak > 0) {
      const st = document.createElement("span");
      st.className = "badge streak";
      st.textContent = ICONS.fire + " " + task.streak;
      meta.appendChild(st);
    }
  }
  if (task.deadline && !task.done) {
    const dl = document.createElement("span");
    const neutral = task.deadlineEnabled === false && task.repeat !== "none";
    dl.className = "badge deadline" + (neutral ? " reset" : (task.deadline < Date.now() ? " overdue" : ""));
    dl.dataset.taskId = task.id;
    dl.textContent = neutral ? formatResetIn(task.deadline) : formatDeadline(task.deadline);
    meta.appendChild(dl);
  }
  if (Game.isIgnored(task)) {
    const ig = document.createElement("span");
    ig.className = "badge ignored";
    ig.textContent = ICONS.noEntry + " ignored";
    meta.appendChild(ig);
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
    tl.textContent = `${ICONS.timeLimit} ${formatMinutesSeconds(Math.max(0, timeLimitRemaining(task, Date.now())))}`;
    return tl;
  }
  const tl = document.createElement("span");
  tl.className = "badge timer";
  tl.textContent = `${ICONS.timeLimit} ${task.timeLimit}m`;
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
      vibrateForReward(st.reward);
    }
  });
  return scb;
}

function subtaskRow(task, st, parentLocked, chainInfo = null, chainUi = null) {
  const row = document.createElement("div");
  row.className = "subtask subtask-row-" + st.id + " diff-" + st.difficulty + (st.done ? " done" : "");
  row.title = "Difficulty: " + st.difficulty.replace("_", " ");
  row.dataset.parentId = task.id;
  row.dataset.subtaskId = st.id;
  const rowColor = chainInfo ? chainInfo.branchDots.get(st.id) : null;
  if (rowColor && chainUi && (chainUi.inlineLink || chainUi.zigzagAbove)) {
    row.appendChild(chainDot("chain-corner-dot", rowColor));
  }
  if (chainUi && chainUi.inlineLink) row.appendChild(chainInlineSymbol(() => Game.unchainSubtask(task, st)));
  if (chainUi && chainUi.zigzagAbove) row.appendChild(zigzagEdgeNode(true, () => expandSubtaskChain(task, st)));
  if (chainUi && chainUi.zigzagBelow) row.appendChild(zigzagEdgeNode(false, () => expandSubtaskChain(task, st)));
  const stLocked = parentLocked || (!Game.subtaskChainSatisfies(task, st) && !st.done);
  const restoreSub = E.pending && E.pending.kind === "restore" && E.pending.subKey
    ? E.pending.subKey === task.id + ":" + st.id : false;
  const editingThisSub = restoreSub
    || (editingSubtaskOf(task) === st && E.pending && E.pending.kind === "subtask");
  const stEdit = document.createElement("button");
  stEdit.className = "task-edit subtask-edit";
  stEdit.textContent = ICONS.pencil;
  stEdit.addEventListener("click", () => openSubtaskEdit(task, st));
  const stTitle = editingThisSub ? buildTitleInput(st.title) : document.createElement("span");
  stTitle.className = editingThisSub ? "subtask-title title-input" : "subtask-title";
  if (!editingThisSub) {
    stTitle.textContent = st.title;
    if (chainInfo && chainInfo.splitDots.has(st.id)) {
      stTitle.appendChild(chainDot("chain-split-dot", chainInfo.splitDots.get(st.id)));
    }
    stTitle.appendChild(stEdit);
  }
  const stDel = document.createElement("button");
  stDel.className = "task-delete subtask-delete";
  stDel.textContent = ICONS.x;
  armDeleteButton(stDel, () => Game.deleteSubtask(task, st.id));
  subtaskDraggable(row, task, st);
  row.appendChild(subtaskCheckbox(row, task, st, stLocked, parentLocked));
  row.appendChild(stTitle);
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

function subtaskListNode(task, li, chainInfo = null) {
  const parentLocked = Game.subtasksLockedByChain(task);
  if (task.subtasks.length === 0 && task.done) return null;
  const sublist = document.createElement("div");
  sublist.className = "subtask-list" + (parentLocked ? " chain-locked" : "");
  const subs = chainOrdered(task.subtasks);
  const chainVis = chainVisibility(subs, isGlobalEditMode(), (h) => AppUI.expandedChains.has("s:" + task.id + ":" + h));
  const subInfo = chainInfo && chainInfo.subtasks ? chainInfo.subtasks.get(task.id) : null;
  let prevSub = null;
  let anyChainSymbol = false;
  for (const st of subs) {
    const v = chainVis.get(st.id);
    if (v.hidden) continue;
    const prevIsPredecessor = prevSub && prevSub.id === st.chainedAfter;
    const chainUi = {
      inlineLink: Boolean(st.chainedAfter) && !v.zigzagAbove && !prevIsPredecessor,
      zigzagAbove: v.zigzagAbove,
      zigzagBelow: v.zigzagBelow,
    };
    anyChainSymbol = anyChainSymbol || chainUi.inlineLink;
    if (!v.zigzagAbove && prevIsPredecessor) {
      anyChainSymbol = true;
      sublist.appendChild(chainLinkNode("subtask-link-row", () => Game.unchainSubtask(task, st)));
    }
    const { row, editingThisSub, stTitle } = subtaskRow(task, st, parentLocked, subInfo, chainUi);
    sublist.appendChild(row);
    prevSub = st;
    if (editingThisSub) {
      activateEdit(li, stTitle, E.pending.controls, E.pending.onSave);
      sublist.insertBefore(buildEditControlsRow(), row.nextSibling);
    }
  }
  sublist.classList.toggle("has-chain-link", anyChainSymbol);
  // The + row is hidden by CSS unless global edit mode is on; show it for
  // finished parents too, so subtasks can still be added in edit mode.
  if (!task.done || isGlobalEditMode()) sublist.appendChild(subtaskAddRow(task));
  return sublist;
}

function taskActionsNode(task) {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "task-pin" + (task.pinned ? " pinned" : "");
  pin.textContent = ICONS.pin;
  pin.title = task.pinned ? "Unpin task" : "Pin task " + ICONS.emDash + " always in Highlight, first in other lists";
  pin.addEventListener("click", () => Game.editTask(task.id, { pinned: !task.pinned }));

  const del = document.createElement("button");
  del.className = "task-delete";
  del.textContent = ICONS.x;
  armDeleteButton(del, () => deleteTaskWithConfirm(task));

  const edit = document.createElement("button");
  edit.className = "task-edit";
  edit.textContent = ICONS.pencil;
  edit.addEventListener("click", () => openEditRow(task));

  const actions = document.createElement("div");
  const editingThis = E.taskId === task.id || editingSubtaskOf(task);
  actions.className = "task-actions" + (editingThis ? " hidden" : "");
  if (task.list !== "group") actions.appendChild(pin);
  actions.appendChild(edit);
  actions.appendChild(del);

  if (task.timeLimit && !task.done && timeLimitRemaining(task, Date.now()) <= 0) {
    const start = document.createElement("button");
    start.className = "task-start";
    start.type = "button";
    start.textContent = ICONS.play + " Start";
    start.title = `Finish within ${task.timeLimit} min for a bonus`;
    start.addEventListener("click", () => Game.startTask(task));
    actions.appendChild(start);
  }
  return actions;
}

function expandTaskChain(task) {
  const head = Game.chainHead(Game.state.tasks, task);
  AppUI.expandedChains.add("t:" + head.id);
  render();
}

function expandSubtaskChain(task, st) {
  const head = Game.chainHead(task.subtasks, st);
  AppUI.expandedChains.add("s:" + task.id + ":" + head.id);
  render();
}

document.addEventListener("click", (ev) => {
  if (AppUI.expandedChains.size === 0) return;
  const taskEl = ev.target && ev.target.closest ? ev.target.closest(".task") : null;
  const keep = new Set();
  if (taskEl) {
    const task = Game.state.tasks.find((t) => t.id === Number(taskEl.dataset.id));
    if (task) {
      keep.add("t:" + Game.chainHead(Game.state.tasks, task).id);
      for (const k of AppUI.expandedChains) {
        if (k.startsWith("s:" + task.id + ":")) keep.add(k);
      }
    }
  }
  let changed = false;
  for (const k of AppUI.expandedChains) {
    if (!keep.has(k)) {
      AppUI.expandedChains.delete(k);
      changed = true;
    }
  }
  if (changed) render();
});

function groupNode(task, chainInfo = null, chainVis = null) {
  const li = document.createElement("li");
  li.className = "task group";
  li.dataset.id = task.id;
  li.title = "Group";
  const editingThisTask = E.taskId === task.id && E.pending && E.pending.kind === "task"
    || (E.pending && E.pending.kind === "restore" && E.pending.taskId === task.id);
  const body = document.createElement("div");
  body.className = "task-body";
  const { node: title, input: titleInput } = taskTitleNode(task, editingThisTask, chainInfo);
  body.appendChild(title);
  if (editingThisTask) {
    activateEdit(li, titleInput, E.pending.controls, E.pending.onSave);
    body.appendChild(buildEditControlsRow());
  }
  const children = document.createElement("div");
  children.className = "group-children";
  const members = Game.state.tasks.filter((t) => t.groupId === task.id);
  const ordered = chainOrdered(members, sortTasks(members));
  let prevM = null;
  for (const m of ordered) {
    const v = chainVis && chainVis.get(m.id) ? chainVis.get(m.id) : { hidden: false, zigzagAbove: false, zigzagBelow: false };
    if (v.hidden) continue;
    const prevIsPred = prevM && prevM.id === m.chainedAfter;
    const mChainUi = {
      inlineLink: Boolean(m.chainedAfter) && !v.zigzagAbove && !prevIsPred,
      zigzagAbove: v.zigzagAbove,
      zigzagBelow: v.zigzagBelow,
    };
    if (!v.zigzagAbove && prevIsPred) {
      children.appendChild(chainLinkNode("chain-link-row", () => Game.unchainTask(m)));
    }
    children.appendChild(taskNode(m, chainInfo, mChainUi, chainVis));
    prevM = m;
  }
  body.appendChild(children);
  li.appendChild(body);
  li.appendChild(taskActionsNode(task));
  return li;
}

function taskNode(task, chainInfo = null, chainUi = null, chainVis = null) {
  if (task.list === "group") return groupNode(task, chainInfo, chainVis);
  const li = document.createElement("li");
  li.className = "task diff-" + (task.difficulty || "fun") + (task.done ? " done" : "") + (Game.isIgnored(task) ? " ignored" : "");
  li.dataset.id = task.id;
  li.title = task.list === "fun" ? "Fun task" : "Difficulty: " + task.difficulty.replace("_", " ");
  const liColor = chainInfo ? chainInfo.branchDots.get(task.id) : null;
  if (liColor && chainUi && (chainUi.inlineLink || chainUi.zigzagAbove)) {
    li.appendChild(chainDot("chain-corner-dot", liColor));
  }
  if (chainUi && chainUi.inlineLink) li.appendChild(chainInlineSymbol(() => Game.unchainTask(task)));
  if (chainUi && chainUi.zigzagAbove) li.appendChild(zigzagEdgeNode(true, () => expandTaskChain(task)));
  if (chainUi && chainUi.zigzagBelow) li.appendChild(zigzagEdgeNode(false, () => expandTaskChain(task)));

  const editingThisTask = E.taskId === task.id && E.pending && E.pending.kind === "task"
    || (E.pending && E.pending.kind === "restore" && E.pending.taskId === task.id);

  const body = document.createElement("div");
  body.className = "task-body";
  const { node: title, input: titleInput } = taskTitleNode(task, editingThisTask, chainInfo);
  body.appendChild(title);
  body.appendChild(taskMetaNode(task));
  if (editingThisTask) {
    activateEdit(li, titleInput, E.pending.controls, E.pending.onSave);
    body.appendChild(buildEditControlsRow());
  }
  const sublist = subtaskListNode(task, li, chainInfo);
  if (sublist) body.appendChild(sublist);

  taskDraggable(li, task);

  const cb = taskCheckbox(li, task);
  const fill = buildSubtaskFill(task);
  if (fill) {
    const wrap = document.createElement("span");
    wrap.className = "task-check-wrap";
    wrap.appendChild(fill);
    wrap.appendChild(cb);
    li.appendChild(wrap);
  } else {
    li.appendChild(cb);
  }
  li.appendChild(body);
  li.appendChild(taskActionsNode(task));
  return li;
}

function tasksForTab() {
  if (AppUI.activeTab === "highlight") return Game.highlightTasks().filter((t) => !t.groupId);
  return Game.state.tasks.filter((t) => !t.groupId && ((t.list || "todo") === AppUI.activeTab || t.list === "group"));
}

let prevDailyReached = null;
let prevWeeklyReached = null;
let dailyHoldGoal = null;
let weeklyHoldGoal = null;

function renderBarFill(barEl, pct) {
  barEl.innerHTML = "";
  const fill = document.createElement("div");
  fill.className = "daily-bar-fill";
  fill.style.width = Math.min(100, pct) + "%";
  barEl.appendChild(fill);
}

function renderDailyProgress() {
  const goals = Game.DAILY_GOALS;
  const reached = Game.reachedGoalCount(Game.state.dailyCompleted);
  if (prevDailyReached !== null && reached > prevDailyReached && dailyHoldGoal === null) {
    dailyHoldGoal = goals[reached - 1] || goals[goals.length - 1];
    celebrateGoal(AppUI.els.dailyBar, () => {
      dailyHoldGoal = null;
      renderDailyProgress();
    });
  }
  prevDailyReached = reached;
  const holdGoal = dailyHoldGoal;
  const nextGoal = holdGoal ?? (goals[reached] || goals[goals.length - 1]);
  const completed = holdGoal ? Math.min(Game.state.dailyCompleted, holdGoal) : Game.state.dailyCompleted;
  AppUI.els.dailyProgressEl.textContent =
    !holdGoal && reached >= goals.length
      ? `${Game.state.dailyCompleted} ${ICONS.check} all goals done`
      : `${completed}/${nextGoal}`;
  renderBarFill(AppUI.els.dailyBar, (completed / nextGoal) * 100);
}

function renderWeeklyProgress() {
  const goals = Game.WEEKLY_GOALS;
  const reached = Game.reachedWeeklyGoalCount(Game.state.weeklyCompleted);
  if (prevWeeklyReached !== null && reached > prevWeeklyReached && weeklyHoldGoal === null) {
    weeklyHoldGoal = goals[reached - 1] || goals[goals.length - 1];
    celebrateGoal(AppUI.els.weeklyBar, () => {
      weeklyHoldGoal = null;
      renderWeeklyProgress();
    });
  }
  prevWeeklyReached = reached;
  const holdGoal = weeklyHoldGoal;
  const nextGoal = holdGoal ?? (goals[reached] || goals[goals.length - 1]);
  const completed = holdGoal ? Math.min(Game.state.weeklyCompleted, holdGoal) : Game.state.weeklyCompleted;
  AppUI.els.weeklyProgressEl.textContent =
    !holdGoal && reached >= goals.length
      ? `${Game.state.weeklyCompleted} ${ICONS.check}`
      : `${completed}/${nextGoal}`;
  renderBarFill(AppUI.els.weeklyBar, (completed / nextGoal) * 100);
}

function renderProgress() {
  renderDailyProgress();
  renderWeeklyProgress();
}

let render = function () {
  const visible = tasksForTab();
  const sorted = chainOrdered(visible, sortTasks(visible));
  const chainVis = chainVisibility(Game.state.tasks, isGlobalEditMode() || AppUI.activeTab === "highlight", (h) => AppUI.expandedChains.has("t:" + h));
  const chainInfo = buildChainColorInfo(Game.state.tasks);
  const shown = sorted.filter((t) => !chainVis.get(t.id).hidden);
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
  for (const task of shown) {
    const v = chainVis.get(task.id);
    const prevIsPredecessor = prevTask && prevTask.id === task.chainedAfter;
    const chainUi = {
      inlineLink: Boolean(task.chainedAfter) && !v.zigzagAbove && !prevIsPredecessor,
      zigzagAbove: v.zigzagAbove,
      zigzagBelow: v.zigzagBelow,
    };
    if (!v.zigzagAbove && prevIsPredecessor) {
      AppUI.els.listEl.appendChild(chainLinkNode("chain-link-row", () => Game.unchainTask(task)));
    }
    const node = taskNode(task, chainInfo, chainUi, chainVis);
    AppUI.els.listEl.appendChild(node);
    prevTask = task;
  }

  AppUI.els.listEl.classList.toggle("editing", E.taskId !== null || E.subtaskKey !== null);
  AppUI.els.emptyHint.classList.toggle("hidden", shown.length > 0);
  AppUI.els.emptyHint.textContent = AppUI.activeTab === "highlight"
    ? "Everything done! " + ICONS.party
    : "Nothing to do yet " + ICONS.emDash + " add a task! " + ICONS.party;
  renderBalances();

  renderProgress();

  AppUI.els.levelDisplayEl.textContent = Game.levelFromXp(Game.state.xp);
  const streakSum = Game.totalStreakSum();
  AppUI.els.streakSumEl.textContent = streakSum;
  AppUI.els.streakSumEl.closest(".streak-sum").classList.toggle("off", streakSum < Game.state.maxStreakSum);

  updateBoostBar();
}

// Tiny yellowish confetti particles at the moving (right) end of the boost
// bar: small, short fall, downward only (positive vy = down in Confetti).
function spawnBoostSparkle() {
  const fill = AppUI.els.boostBarFillEl;
  if (!fill || AppUI.els.boostBannerEl.classList.contains("hidden")) return;
  const r = fill.getBoundingClientRect();
  Confetti.burstAt(
    { x: r.right - 2, y: r.top + r.height / 2, width: 0, height: r.height },
    1,
    { colors: ["#f2a900", "#e08e00", "#e08e00", "#f7c04a"], sizePx: 3, vyMin: 15, vyMax: 45, vx: 12, spin: 240, gravity: 500, lifetimeMs: 350 }
  );
}

function updateBoostBar() {
  const active = Game.isBoostActive();
  AppUI.els.boostBannerEl.classList.toggle("hidden", !active);
  if (!active) return;
  const remaining = Math.max(0, Game.state.boostUntil - Date.now());
  const pct = Math.min(100, (remaining / Game.BOOST_DURATION_MS) * 100);
  AppUI.els.boostBarFillEl.style.width = pct + "%";
}

function updateLiveClocks() {
  const now = Date.now();
  updateBoostBar();

  for (const li of AppUI.els.listEl.querySelectorAll("li.task")) {
    const t = Game.state.tasks.find((x) => x.id === Number(li.dataset.id));
    if (t) li.classList.toggle("ignored", Game.isIgnored(t, now));
  }

  for (const node of AppUI.els.listEl.querySelectorAll(".badge.deadline")) {
    const task = Game.state.tasks.find((t) => t.id === Number(node.dataset.taskId));
    if (!task || task.done) continue;
    if (node.classList.contains("reset")) {
      node.textContent = formatResetIn(task.deadline);
    } else {
      node.textContent = formatDeadline(task.deadline);
      node.classList.toggle("overdue", task.deadline < Date.now());
    }
  }

  for (const node of AppUI.els.listEl.querySelectorAll(".badge.timer.running")) {
    const task = Game.state.tasks.find((t) => t.id === Number(node.dataset.taskId));
    if (!task) continue;
    const remaining = timeLimitRemaining(task, now);
    node.textContent = `${ICONS.timeLimit} ${formatMinutesSeconds(Math.max(0, remaining))}`;
    node.classList.toggle("overdue", remaining <= 0);
  }

}

export { deleteTaskWithConfirm, render, spawnBoostSparkle, subtaskAddRow, subtaskCheckbox, subtaskListNode, subtaskRow, taskActionsNode, taskCheckbox, taskMetaNode, taskNode, taskTimeBadge, taskTitleNode, tasksForTab, updateLiveClocks  };
