(() => {
  "use strict";

  const listEl = document.getElementById("task-list");
  const tabsEl = document.getElementById("task-tabs");
  const listSelect = document.getElementById("list-select");
  let activeTab = "highlight";
  const sheetContentEl = document.querySelector(".sheet-content");
  const emptyHint = document.getElementById("empty-hint");
  const coinBalanceEl = document.getElementById("coin-balance");
  const gemBalanceEl = document.getElementById("gem-balance");
  const dailyProgressEl = document.getElementById("daily-progress");
  const dailyBar = document.getElementById("daily-bar");
  const weeklyProgressEl = document.getElementById("weekly-progress");
  const weeklyBar = document.getElementById("weekly-bar");
  const levelDisplayEl = document.getElementById("level-display");
  const boostBannerEl = document.getElementById("boost-banner");
  const boostTimerEl = document.getElementById("boost-timer");
  const resetBtn = document.getElementById("reset-btn");
  const versionEl = document.getElementById("app-version");
  const form = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const difficultySelect = document.getElementById("difficulty-select");
  const repeatSelect = document.getElementById("repeat-select");
  const deadlineInput = document.getElementById("deadline-input");
  const deadlineWrap = document.getElementById("deadline-wrap");
  const repeatTimeWrap = document.getElementById("repeat-time-wrap");
  const repeatTimeInput = document.getElementById("repeat-time-input");
  const toastEl = document.getElementById("toast");

  let toastTimer = null;
  const toastQueue = [];

  const balanceAnim = new Map();

  function animateBalance(el, target) {
    const from = Number(el.textContent) || 0;
    if (from === target) return;
    if (balanceAnim.has(el)) cancelAnimationFrame(balanceAnim.get(el));
    const start = performance.now();
    const duration = Math.min(900, 200 + Math.abs(target - from) * 30);
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (target - from) * eased);
      if (t < 1) balanceAnim.set(el, requestAnimationFrame(tick));
      else balanceAnim.delete(el);
    }
    balanceAnim.set(el, requestAnimationFrame(tick));
  }

  function renderBalances() {
    animateBalance(coinBalanceEl, Game.state.coins);
    animateBalance(gemBalanceEl, Game.state.gems);
  }

  function displayNextToast() {
    const next = toastQueue.shift();
    if (next === undefined) {
      toastEl.classList.add("hidden");
      toastTimer = null;
      return;
    }
    toastEl.textContent = next;
    toastEl.classList.remove("hidden");
    toastTimer = setTimeout(displayNextToast, 2000);
  }

  function showToast(message) {
    toastQueue.push(message);
    if (toastTimer === null) displayNextToast();
  }

  Game.ui.render = () => render();
  Game.ui.showToast = (message) => showToast(message);
  Game.ui.promptDifficultyRating = (task) => promptDifficultyRating(task);

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
  ];
  const TIME_LIMIT_OPTIONS = [
    [0, "No time limit"],
    [5, "5 min"],
    [15, "15 min"],
    [30, "30 min"],
    [60, "60 min"],
  ];

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

  const DRAG_HOLD_MS = 1000;
  let activeDrag = null;
  let armedHoldNode = null;

  document.addEventListener(
    "touchmove",
    (ev) => {
      if (armedHoldNode || activeDrag) ev.preventDefault();
    },
    { passive: false }
  );

  function clearDropHighlights() {
    document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
  }

  function dropTargetAt(dropEl, drag) {
    if (!dropEl || !dropEl.closest) return null;
    if (drag.kind === "subtask") {
      const subRow = dropEl.closest(".subtask");
      if (subRow && subRow.dataset.parentId === String(drag.parent.id)) {
        return { kind: "subtask", id: Number(subRow.dataset.subtaskId) };
      }
      return null;
    }
    const taskRow = dropEl.closest(".task");
    if (!taskRow || taskRow === drag.sourceNode) return null;
    return { kind: "task", id: Number(taskRow.dataset.id) };
  }

  function finishDrag(ev) {
    const drag = activeDrag;
    activeDrag = null;
    drag.sourceNode.classList.remove("dragging");
    clearDropHighlights();
    if (!ev) return;
    const target = dropTargetAt(document.elementFromPoint(ev.clientX, ev.clientY), drag);
    if (!target) return;
    if (drag.kind === "subtask") {
      Game.chainSubtask(drag.parent, drag.subtask, target.id);
    } else {
      Game.chainTask(drag.task, target.id);
    }
  }

  function holdDraggable(li, canDrag, onDragStart) {
    li.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("button, input, select, a")) return;
      if (!canDrag()) return;
      const startX = e.clientX;
      const startY = e.clientY;
      let armed = false;
      const holdTimer = setTimeout(() => {
        armed = true;
        armedHoldNode = li;
        li.classList.add("drag-ready");
      }, DRAG_HOLD_MS);

      const onContextMenu = (ev) => {
        if (armed) ev.preventDefault();
      };
      li.addEventListener("contextmenu", onContextMenu);

      const onMove = (ev) => {
        if (!armed) {
          if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) cleanup();
          return;
        }
        if (!activeDrag) {
          activeDrag = onDragStart();
          activeDrag.sourceNode = li;
          li.classList.add("dragging");
        }
        ev.preventDefault();
        clearDropHighlights();
        const dropEl = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!dropEl) return;
        const target = dropTargetAt(dropEl, activeDrag);
        const targetRow = target && target.kind === "subtask"
          ? dropEl.closest(".subtask")
          : target
            ? dropEl.closest(".task")
            : null;
        if (targetRow && targetRow !== li) targetRow.classList.add("drop-target");
      };
      const onUp = (ev) => {
        const wasDragging = Boolean(activeDrag && activeDrag.sourceNode === li);
        if (wasDragging) finishDrag(ev);
        cleanup();
      };
      const cleanup = () => {
        clearTimeout(holdTimer);
        armed = false;
        if (armedHoldNode === li) armedHoldNode = null;
        li.classList.remove("drag-ready");
        li.removeEventListener("contextmenu", onContextMenu);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", cleanup);
        if (activeDrag && activeDrag.sourceNode === li) finishDrag();
      };
      document.addEventListener("pointermove", onMove, { passive: false });
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", cleanup);
    });
  }

  function taskDraggable(li, task) {
    holdDraggable(
      li,
      () => !task.done,
      () => ({ kind: "task", task })
    );
  }

  function subtaskDraggable(row, parent, subtask) {
    holdDraggable(
      row,
      () => !subtask.done && !parent.done,
      () => ({ kind: "subtask", parent, subtask })
    );
  }

  let editingTaskId = null;
  let editingSubtaskKey = null;
  let pendingEdit = null;
  let activeEdit = null;

  function editingSubtaskOf(task) {
    if (editingSubtaskKey == null || editingTaskId != null) return null;
    const sep = editingSubtaskKey.indexOf(":");
    const parentId = Number(editingSubtaskKey.slice(0, sep));
    const subtaskId = Number(editingSubtaskKey.slice(sep + 1));
    if (parentId !== task.id) return null;
    return task.subtasks.find((st) => st.id === subtaskId) || null;
  }

  function clearEditing() {
    editingTaskId = null;
    editingSubtaskKey = null;
    pendingEdit = null;
    activeEdit = null;
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
        if (activeEdit) activeEdit.onSave(activeEdit.input.value);
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
    for (const control of activeEdit.controls) row.appendChild(control);
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.addEventListener("click", () => activeEdit.onSave(activeEdit.input.value));
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
    activeEdit = { scope, input, controls, onSave, initial: editValues(input, controls) };
    pendingEdit = null;
  }

  function openSubtaskEdit(parent, subtask) {
    const diff = buildSelect(DIFFICULTY_OPTIONS, subtask.difficulty);
    clearEditing();
    editingSubtaskKey = parent.id + ":" + subtask.id;
    pendingEdit = {
      kind: "subtask",
      controls: [diff],
      onSave: (title) => {
        clearEditing();
        Game.editSubtask(parent, subtask, title, diff.value);
      },
    };
    render();
  }

  document.addEventListener("focusout", (e) => {
    if (!activeEdit) return;
    if (e.relatedTarget && activeEdit.scope.contains(e.relatedTarget)) return;
    const current = editValues(activeEdit.input, activeEdit.controls);
    if (current.every((v, i) => v === activeEdit.initial[i])) {
      clearEditing();
      render();
    }
  });

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

  function chainOrdered(items, base) {
    const ordered = base || items;
    const baseIndex = new Map(ordered.map((it, i) => [it.id, i]));
    const byId = new Map(items.map((it) => [it.id, it]));
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
      let head = item;
      const guard = new Set();
      while (head.chainedAfter && byId.has(head.chainedAfter) && !guard.has(head.id)) {
        guard.add(head.id);
        head = byId.get(head.chainedAfter);
      }
      emitFrom(head);
    }
    return result;
  }

  function chainLinkNode(className, onUnlink) {
    const row = document.createElement(className === "chain-link-row" ? "li" : "div");
    row.className = className;
    const line = document.createElement("span");
    line.className = "chain-line";
    const unlink = document.createElement("button");
    unlink.type = "button";
    unlink.className = "chain-unlink";
    unlink.textContent = "🔗";
    unlink.title = "Chained \u2014 click to remove the link";
    unlink.addEventListener("click", onUnlink);
    row.appendChild(line);
    row.appendChild(unlink);
    return row;
  }

  function taskNode(task) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");
    li.dataset.id = task.id;

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
            coinBalanceEl,
            gemBalanceEl,
            sheetContentEl
          );
        }
      } else {
        Game.uncompleteTask(task);
      }
    });

    const body = document.createElement("div");
    body.className = "task-body";

    const editingThisTask = editingTaskId === task.id && pendingEdit && pendingEdit.kind === "task";
    let title;
    let titleInput = null;
    if (editingThisTask) {
      titleInput = buildTitleInput(task.title);
      title = document.createElement("div");
      title.className = "task-title editing";
      title.appendChild(titleInput);
    } else {
      title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;
    }

    const badge = document.createElement("span");
    badge.className = "badge task-difficulty-badge " + (task.difficulty || "fun");
    badge.textContent = task.list === "fun"
      ? "🎈 fun"
      : task.difficulty.replace("_", " ");

    const meta = document.createElement("div");
    meta.className = "task-meta";
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
    if (task.deadline && !task.done) {
      const dl = document.createElement("span");
      dl.className = "badge deadline" + (task.deadline < Date.now() ? " overdue" : "");
      dl.textContent = formatDeadline(task.deadline);
      meta.appendChild(dl);
    }
    if (task.timeLimit && !task.done) {
      if (task.startedAt) {
        const tl = document.createElement("span");
        tl.className = "badge timer running";
        tl.dataset.taskId = task.id;
        tl.textContent = `⏱️ ${formatMinutesSeconds(Math.max(0, timeLimitRemaining(task, Date.now())))}`;
        meta.appendChild(tl);
      } else {
        const tl = document.createElement("span");
        tl.className = "badge timer";
        tl.textContent = `⏱️ ${task.timeLimit}m`;
        meta.appendChild(tl);
      }
    }

    if (editingThisTask) title.appendChild(badge);
    body.appendChild(title);
    body.appendChild(meta);
    if (editingThisTask) {
      activateEdit(li, titleInput, pendingEdit.controls, pendingEdit.onSave);
      body.appendChild(buildEditControlsRow());
    }

    if (task.subtasks.length > 0 || !task.done) {
      const sublist = document.createElement("div");
      sublist.className = "subtask-list";
      for (const st of chainOrdered(task.subtasks)) {
        if (st.chainedAfter) {
          sublist.appendChild(chainLinkNode("subtask-link-row", () => Game.unchainSubtask(task, st)));
        }
        const row = document.createElement("div");
        row.className = "subtask subtask-row-" + st.id + (st.done ? " done" : "");
        row.dataset.parentId = task.id;
        row.dataset.subtaskId = st.id;
        const stLocked = !Game.subtaskChainSatisfies(task, st) && !st.done;
        const scb = document.createElement("input");
        scb.type = "checkbox";
        scb.checked = st.done;
        scb.disabled = stLocked;
        if (stLocked) scb.title = "Complete the chained predecessor first";
        scb.addEventListener("change", () => {
          const origin = Confetti.originOf(row);
          Game.toggleSubtask(task, st);
          if (st.done) {
            Confetti.burstAt(origin, Math.ceil((Game.CONFETTI_COUNT[st.difficulty] || 12) / 2));
            RewardFlight.flyRewards(
              { x: origin.x + origin.width / 2, y: origin.y },
              st.reward ? st.reward.coins : 0,
              st.reward ? st.reward.gems : 0,
              coinBalanceEl,
              gemBalanceEl,
              sheetContentEl
            );
          }
        });
        const editingThisSub = editingSubtaskOf(task) === st && pendingEdit && pendingEdit.kind === "subtask";
        const stTitle = editingThisSub ? buildTitleInput(st.title) : document.createElement("span");
        stTitle.className = editingThisSub ? "subtask-title title-input" : "subtask-title";
        if (!editingThisSub) stTitle.textContent = st.title;
        const stEdit = document.createElement("button");
        stEdit.className = "task-edit subtask-edit";
        stEdit.textContent = "✎";
        stEdit.addEventListener("click", () => openSubtaskEdit(task, st));
        const stBadge = document.createElement("span");
        stBadge.className = "subtask-difficulty-dot " + st.difficulty;
        stBadge.title = st.difficulty.replace("_", " ");
        const stDel = document.createElement("button");
        stDel.className = "task-delete subtask-delete";
        stDel.textContent = "✕";
        stDel.addEventListener("click", () => Game.deleteSubtask(task, st.id));
        subtaskDraggable(row, task, st);
        row.appendChild(scb);
        row.appendChild(stTitle);
        row.appendChild(stBadge);
        row.appendChild(stEdit);
        row.appendChild(stDel);
        sublist.appendChild(row);
        if (editingThisSub) {
          activateEdit(li, stTitle, pendingEdit.controls, pendingEdit.onSave);
          sublist.insertBefore(buildEditControlsRow(), row.nextSibling);
        }
      }
      if (!task.done) {
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
        addBtn.addEventListener("click", () => {
          if (addForm.classList.contains("hidden")) {
            addForm.classList.remove("hidden");
            addInput.focus();
            return;
          }
          const v = addInput.value.trim();
          if (!v) return;
          Game.addSubtask(task.id, v, addDiff.value);
        });
        addInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = addInput.value.trim();
            if (v) Game.addSubtask(task.id, v, addDiff.value);
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
        sublist.appendChild(addRow);
      }
      body.appendChild(sublist);
    }

    const del = document.createElement("button");
    del.className = "task-delete";
    del.textContent = "✕";
    del.addEventListener("click", () => Game.deleteTask(task.id));

    const edit = document.createElement("button");
    edit.className = "task-edit";
    edit.textContent = "✎";
    edit.addEventListener("click", () => openEditRow(task));

    const actions = document.createElement("div");
    const editingThis = editingTaskId === task.id || editingSubtaskOf(task);
    actions.className = "task-actions" + (editingThis ? " hidden" : "");
    actions.appendChild(edit);
    actions.appendChild(del);

    if (task.timeLimit && !task.done && timeLimitRemaining(task, Date.now()) <= 0) {
      const start = document.createElement("button");
      start.className = "task-start";
      start.type = "button";
      start.textContent = "▶ Start";
      start.title = `Finish within ${task.timeLimit} min for a bonus`;
      start.addEventListener("click", () => Game.startTask(task));
      actions.appendChild(start);
    }

    taskDraggable(li, task);

    li.appendChild(cb);
    li.appendChild(body);
    li.appendChild(actions);
    if (!editingThisTask) li.appendChild(badge);
    return li;
  }

  function deadlineInputValue(task) {
    if (!task.deadline) return "";
    const d = new Date(task.deadline);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEditRow(task) {
    const diff = buildSelect(DIFFICULTY_OPTIONS, task.difficulty);
    diff.disabled = task.subtasks.length > 0;
    diff.title = task.subtasks.length > 0
      ? "Difficulty is derived from the most difficult sub-task"
      : "";

    const rep = buildSelect(REPEAT_OPTIONS, task.repeat);

    const dl = document.createElement("input");
    dl.type = "datetime-local";
    dl.value = deadlineInputValue(task);
    const dlWrap = document.createElement("label");
    dlWrap.className = "deadline-label edit-deadline";
    dlWrap.textContent = "📅 Deadline ";
    dlWrap.appendChild(dl);

    const isRepeating = task.repeat !== "none" && task.repeat !== "every_5min";

    const repTime = document.createElement("input");
    repTime.type = "time";
    if (Number.isFinite(task.repeatTime)) {
      repTime.value = `${String(Math.floor(task.repeatTime / 60)).padStart(2, "0")}:${String(task.repeatTime % 60).padStart(2, "0")}`;
    }
    const repTimeWrap = document.createElement("label");
    repTimeWrap.className = "deadline-label edit-deadline";
    repTimeWrap.textContent = "🕐 Repeat due at ";
    repTimeWrap.appendChild(repTime);

    const timeLimit = buildSelect(TIME_LIMIT_OPTIONS, task.timeLimit || 0);
    const timeLimitWrap = document.createElement("label");
    timeLimitWrap.className = "deadline-label";
    timeLimitWrap.textContent = "⏱️ Time limit ";
    timeLimitWrap.appendChild(timeLimit);

    const afterComp = document.createElement("label");
    afterComp.className = "after-completion-label";
    const afterCompCb = document.createElement("input");
    afterCompCb.type = "checkbox";
    afterCompCb.checked = task.repeatAfterCompletion === true;
    const afterCompText = document.createElement("span");
    afterCompText.textContent = "Time after completion";
    afterComp.appendChild(afterCompCb);
    afterComp.appendChild(afterCompText);

    const controls = isRepeating
      ? [diff, rep, repTimeWrap, afterComp, timeLimitWrap]
      : [diff, rep, dlWrap, timeLimitWrap];

    clearEditing();
    editingTaskId = task.id;
    pendingEdit = {
      kind: "task",
      controls,
      onSave: (title) => {
        const updates = {
          title,
          difficulty: diff.value,
          repeat: rep.value,
        };
        if (isRepeating) {
          updates.timeLimit = Number(timeLimit.value);
          if (repTime.value) {
            const [h, m] = repTime.value.split(":").map(Number);
            updates.repeatTime = (h || 0) * 60 + (m || 0);
          } else {
            updates.repeatTime = NaN;
          }
          updates.repeatAfterCompletion = afterCompCb.checked;
        } else {
          updates.deadline = dl.value;
          updates.timeLimit = Number(timeLimit.value);
        }
        clearEditing();
        Game.editTask(task.id, updates);
      },
    };
    render();
  }

  function tasksForTab() {
    if (activeTab === "highlight") return Game.highlightTasks();
    return Game.state.tasks.filter((t) => (t.list || "todo") === activeTab);
  }

  let render = function () {
    const visible = tasksForTab();
    const sorted = chainOrdered(visible, sortTasks(visible));
    listEl.innerHTML = "";
    if (activeEdit && !activeEdit.scope.isConnected) clearEditing();
    for (const task of sorted) {
      if (task.chainedAfter) {
        listEl.appendChild(chainLinkNode("chain-link-row", () => Game.unchainTask(task)));
      }
      const node = taskNode(task);
      listEl.appendChild(node);
      if (activeEdit && activeEdit.scope === node) activeEdit.input.focus();
    }

    emptyHint.classList.toggle("hidden", visible.length > 0);
    emptyHint.textContent = activeTab === "highlight"
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
    dailyProgressEl.textContent = label;

    const pct = Math.min(100, (Game.state.dailyCompleted / nextGoal) * 100);

    dailyBar.innerHTML = "";
    const fill = document.createElement("div");
    fill.className = "daily-bar-fill";
    fill.style.width = pct + "%";
    dailyBar.appendChild(fill);

    const lastWeekly = Game.WEEKLY_GOALS[Game.WEEKLY_GOALS.length - 1];
    const weekReached = Game.reachedWeeklyGoalCount(Game.state.weeklyCompleted);
    const nextWeekly = Game.WEEKLY_GOALS[weekReached] || lastWeekly;
    weeklyProgressEl.textContent =
      weekReached >= Game.WEEKLY_GOALS.length
        ? `${Game.state.weeklyCompleted} ✅`
        : `${Game.state.weeklyCompleted}/${nextWeekly}`;
    weeklyBar.innerHTML = "";
    const wFill = document.createElement("div");
    wFill.className = "daily-bar-fill";
    wFill.style.width = Math.min(100, (Game.state.weeklyCompleted / nextWeekly) * 100) + "%";
    weeklyBar.appendChild(wFill);

    levelDisplayEl.textContent = Game.levelFromXp(Game.state.xp);

    if (Game.isBoostActive()) {
      boostBannerEl.classList.remove("hidden");
      const remaining = Math.max(0, Game.state.boostUntil - Date.now());
      boostTimerEl.textContent = formatMinutesSeconds(remaining);
    } else {
      boostBannerEl.classList.add("hidden");
    }
  }

  versionEl.textContent = "v" + Game.VERSION;

  const saved = Game.loadState();
  if (saved) Object.assign(Game.state, saved);
  Game.rolloverCheckpoints();
  Game.checkRecurringTasks();
  setInterval(Game.checkRecurringTasks, 15000);
  setInterval(Game.rolloverCheckpoints, 60000);

  function updateLiveClocks() {
    const now = Date.now();
    if (Game.isBoostActive()) {
      boostBannerEl.classList.remove("hidden");
      const remaining = Math.max(0, Game.state.boostUntil - now);
      boostTimerEl.textContent = formatMinutesSeconds(remaining);
    } else {
      boostBannerEl.classList.add("hidden");
    }

    for (const node of listEl.querySelectorAll(".badge.timer.running")) {
      const task = Game.state.tasks.find((t) => t.id === Number(node.dataset.taskId));
      if (!task) continue;
      const remaining = timeLimitRemaining(task, now);
      node.textContent = `⏱️ ${formatMinutesSeconds(Math.max(0, remaining))}`;
      node.classList.toggle("overdue", remaining <= 0);
    }

  }
  setInterval(updateLiveClocks, 1000);

  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset ALL data? This can not be undone.")) return;
    Game.resetState();
    Game.saveState();
    render();
  });

  repeatSelect.addEventListener("change", updateCreateFormMode);
  listSelect.addEventListener("change", updateCreateFormMode);
  updateCreateFormMode();

  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    activeTab = btn.dataset.tab;
    for (const b of tabsEl.querySelectorAll("button")) {
      b.classList.toggle("active", b === btn);
    }
    render();
  });

  function updateCreateFormMode() {
    const isFun = listSelect.value === "fun";
    difficultySelect.disabled = isFun;
    repeatSelect.disabled = isFun;
    deadlineWrap.classList.toggle("hidden", isFun || repeatSelect.value === "daily");
    repeatTimeWrap.classList.toggle("hidden", isFun || repeatSelect.value !== "daily");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;
    if (listSelect.value === "fun") {
      Game.addTask(title, null, "none", "", "fun");
    } else if (repeatSelect.value === "daily" && repeatTimeInput.value) {
      const [h, m] = repeatTimeInput.value.split(":").map(Number);
      const t = Game.addTask(title, difficultySelect.value, repeatSelect.value, "", listSelect.value);
      Game.editTask(t, { repeatTime: (h || 0) * 60 + (m || 0) });
    } else {
      Game.addTask(title, difficultySelect.value, repeatSelect.value, deadlineInput.value, listSelect.value);
    }
    taskInput.value = "";
    repeatTimeInput.value = "";
    deadlineInput.value = "";
    taskInput.focus();
  });

  render();

  const achievementsBtn = document.getElementById("achievements-btn");
  const achievementsOverlay = document.getElementById("achievements-overlay");
  const achievementsClose = document.getElementById("achievements-close");
  const achievementsContent = document.getElementById("achievements-content");
  const shopBtn = document.getElementById("shop-btn");
  const shopOverlay = document.getElementById("shop-overlay");
  const shopClose = document.getElementById("shop-close");
  const tabShop = document.getElementById("tab-shop");
  const tabOwned = document.getElementById("tab-owned");
  const shopContent = document.getElementById("shop-content");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsOverlay = document.getElementById("settings-overlay");
  const settingsClose = document.getElementById("settings-close");
  let shopTab = "shop";

  function itemCostLabel(item) {
    if (item.costCoins > 0 && item.costGems > 0) {
      return `${item.costCoins} 🪙 + ${item.costGems} 💎`;
    }
    return item.costCoins > 0 ? `${item.costCoins} 🪙` : `${item.costGems} 💎`;
  }

  function shopItemNode(item) {
    const card = document.createElement("div");
    card.className = "shop-item";
    const owned = Game.itemIsOwned(item.id);
    const unlockable = Game.itemIsUnlockable(item);
    if (!unlockable) card.classList.add("locked");

    const emoji = document.createElement("div");
    emoji.className = "item-emoji";
    emoji.textContent = item.emoji;

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;

    const cost = document.createElement("div");
    cost.className = "item-cost";
    cost.textContent = itemCostLabel(item);

    card.appendChild(emoji);
    card.appendChild(name);
    card.appendChild(cost);

    if (owned) {
      const tag = document.createElement("div");
      tag.className = "item-lock";
      tag.textContent = "✓ owned";
      card.appendChild(tag);
    } else if (!unlockable) {
      const lock = document.createElement("div");
      lock.className = "item-lock";
      lock.textContent = `🔒 Level ${item.minLevel}`;
      card.appendChild(lock);
    } else {
      const buy = document.createElement("button");
      buy.type = "button";
      buy.textContent = "Buy";
      buy.addEventListener("click", () => {
        const result = Game.purchaseItem(item.id);
        if (result.ok) {
          showToast(`🎉 ${item.emoji} ${item.name} purchased!`);
          Game.saveState();
        } else if (result.reason === "coins" || result.reason === "gems") {
          showToast("Not enough coins/gems 💔");
        }
        renderShop();
      });
      card.appendChild(buy);
    }
    return card;
  }

  function renderShop() {
    if (shopTab === "shop") {
      shopContent.innerHTML = "";
      for (const item of Game.SHOP_ITEMS) {
        shopContent.appendChild(shopItemNode(item));
      }
    } else {
      shopContent.innerHTML = "";
      const owned = Game.SHOP_ITEMS.filter((it) => Game.itemIsOwned(it.id));
      if (owned.length === 0) {
        const empty = document.createElement("p");
        empty.className = "shop-empty";
        empty.textContent = "Nothing owned yet — complete tasks to earn rewards!";
        shopContent.appendChild(empty);
        return;
      }
      for (const item of owned) {
        shopContent.appendChild(shopItemNode(item));
      }
    }
    renderBalances();
  }

  function achievementProgressValue(a) {
    const stats = Game.state.achievements.stats;
    if (a.id === "collector") return Game.state.ownedItems.length;
    const keyMap = {
      first_step: "totalCompleted",
      task_master: "totalCompleted",
      marathon: "totalCompleted",
      streak_3: "bestStreak",
      early_bird: "morningCompleted",
      night_owl: "nightCompleted",
      weekend_warrior: "weekendCompleted",
      chain_gang: "chainedCompleted",
      bonus_hunter: "bonusCompleted",
      chests_opened: "chestsOpened",
      goal_getter: "dailyGoalsReached",
      big_spender: "coinsSpent",
      decorator: "itemsBought",
      redecorator: "itemMoves",
      fun_lover: "funCompleted",
    };
    return stats[keyMap[a.id]] ?? 0;
  }

  function achievementNode(a) {
    const card = document.createElement("div");
    const unlocked = Game.achievementIsUnlocked(a.id);
    card.className = "achievement" + (unlocked ? " unlocked" : "");

    const emoji = document.createElement("div");
    emoji.className = "item-emoji";
    emoji.textContent = unlocked ? a.emoji : "🔒";

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = a.name;

    const hint = document.createElement("div");
    hint.className = "item-cost";
    hint.textContent = a.hint;

    const progress = document.createElement("div");
    progress.className = "achievement-progress";
    const fill = document.createElement("div");
    fill.className = "achievement-progress-fill";
    fill.style.width = Math.min(100, (achievementProgressValue(a) / a.goal) * 100) + "%";
    progress.appendChild(fill);

    const label = document.createElement("div");
    label.className = "achievement-count";
    label.textContent = `${Math.min(achievementProgressValue(a), a.goal)}/${a.goal}`;

    card.appendChild(emoji);
    card.appendChild(name);
    card.appendChild(hint);
    card.appendChild(progress);
    card.appendChild(label);
    return card;
  }

  function renderAchievements() {
    achievementsContent.innerHTML = "";
    const sorted = [...Game.ACHIEVEMENTS].sort((a, b) => {
      const ua = Game.achievementIsUnlocked(a.id) ? 1 : 0;
      const ub = Game.achievementIsUnlocked(b.id) ? 1 : 0;
      return ua - ub;
    });
    for (const a of sorted) {
      achievementsContent.appendChild(achievementNode(a));
    }
  }

  function openAchievements() {
    renderAchievements();
    achievementsOverlay.classList.remove("hidden");
  }

  function closeAchievements() {
    achievementsOverlay.classList.add("hidden");
  }

  achievementsBtn.addEventListener("click", openAchievements);
  achievementsClose.addEventListener("click", closeAchievements);
  achievementsOverlay.addEventListener("click", (e) => {
    if (e.target === achievementsOverlay) closeAchievements();
  });

  function openShop() {
    shopTab = "shop";
    tabShop.classList.add("active");
    tabOwned.classList.remove("active");
    renderShop();
    shopOverlay.classList.remove("hidden");
  }

  function closeShop() {
    shopOverlay.classList.add("hidden");
    render();
  }

  shopBtn.addEventListener("click", openShop);
  shopClose.addEventListener("click", closeShop);
  shopOverlay.addEventListener("click", (e) => {
    if (e.target === shopOverlay) closeShop();
  });

  function openSettings() {
    settingsOverlay.classList.remove("hidden");
  }

  function closeSettings() {
    settingsOverlay.classList.add("hidden");
  }

  settingsBtn.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });
  tabShop.addEventListener("click", () => {
    shopTab = "shop";
    tabShop.classList.add("active");
    tabOwned.classList.remove("active");
    renderShop();
  });
  tabOwned.addEventListener("click", () => {
    shopTab = "owned";
    tabOwned.classList.add("active");
    tabShop.classList.remove("active");
    renderShop();
  });

  const dayStartSelect = document.getElementById("day-start-select");
  dayStartSelect.value = String(Game.state.dayStartHour ?? 0);
  if (![...dayStartSelect.options].some((o) => o.value === dayStartSelect.value)) {
    dayStartSelect.value = "0";
  }
  dayStartSelect.addEventListener("change", () => {
    Game.setDayStartHour(Number(dayStartSelect.value));
    showToast(`🌅 Your day now starts at ${dayStartSelect.value.padStart(2, "0")}:00`);
  });

  const uiSheetEl = document.getElementById("ui-sheet");
  const sheetHandleEl = document.getElementById("sheet-handle");
  const topProgressEl = document.querySelector(".daily-progress");
  const SHEET_MIN_VH = 25;
  const SHEET_TOP_GAP_PX = 8;

  let vhProbeEl = null;
  function getVhPx() {
    if (!vhProbeEl) {
      vhProbeEl = document.createElement("div");
      vhProbeEl.style.cssText =
        "position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none;";
      document.body.appendChild(vhProbeEl);
    }
    return vhProbeEl.getBoundingClientRect().height;
  }

  function getSheetMaxVh() {
    const topUiBottom = topProgressEl ? topProgressEl.getBoundingClientRect().bottom : 0;
    const availablePx = Math.max(0, window.innerHeight - topUiBottom - SHEET_TOP_GAP_PX);
    const maxVh = (availablePx / getVhPx()) * 100;
    return Math.max(SHEET_MIN_VH, maxVh);
  }

  function applySheetHeightVh(vh) {
    const clamped = Math.min(getSheetMaxVh(), Math.max(SHEET_MIN_VH, vh));
    uiSheetEl.style.height = clamped + "vh";
    const roomApi = window.Room && window.Room.lastInstance;
    if (roomApi) roomApi.setVisibleHeightRatio(Math.max(0, 1 - clamped / 100));
  }

  function initUiSheet() {
    applySheetHeightVh(Game.state.uiSheetHeightVh || SHEET_MIN_VH);
    window.addEventListener("room-ready", () => {
      applySheetHeightVh(parseFloat(uiSheetEl.style.height) || SHEET_MIN_VH);
    });
    window.addEventListener("resize", () => {
      applySheetHeightVh(parseFloat(uiSheetEl.style.height) || SHEET_MIN_VH);
    });

    let dragging = false;
    let startY = 0;
    let startVh = 0;

    const onMove = (ev) => {
      if (!dragging) return;
      ev.preventDefault();
      const dy = ev.clientY - startY;
      const vhPerPx = 100 / getVhPx();
      const next = Math.min(getSheetMaxVh(), Math.max(SHEET_MIN_VH, startVh - dy * vhPerPx));
      applySheetHeightVh(next);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      Game.setUiSheetHeightVh(parseFloat(uiSheetEl.style.height));
    };
    sheetHandleEl.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      dragging = true;
      startY = ev.clientY;
      startVh = parseFloat(uiSheetEl.style.height) || SHEET_MIN_VH;
      sheetHandleEl.setPointerCapture?.(ev.pointerId);
      document.addEventListener("pointermove", onMove, { passive: false });
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

  initUiSheet();
})();
