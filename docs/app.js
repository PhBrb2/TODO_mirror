(() => {
  "use strict";

  const listEl = document.getElementById("task-list");
  const tabsEl = document.getElementById("task-tabs");
  let listSelect;
  let activeTab = "highlight";
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
  let difficultySelect;
  let repeatSelect;
  let timeLimitSelect;
  const scheduleContainer = document.getElementById("repeat-schedule");
  let scheduleControls = null;
  const dueAtField = document.getElementById("due-at-field");
  const dueAtWheelsEl = document.getElementById("due-at-wheels");
  let dueAtWheelsControls = null;
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

  listSelect = mountWheel("list-wheel", LIST_OPTIONS, "todo", "List", updateCreateFormMode);
  difficultySelect = mountWheel("difficulty-wheel", DIFFICULTY_OPTIONS, "easy", "Difficulty");
  repeatSelect = mountWheel("repeat-wheel", REPEAT_OPTIONS, "none", "Repeat", updateCreateFormMode);
  timeLimitSelect = mountWheel("time-limit-wheel", TIME_LIMIT_OPTIONS, 0, "Time limit");

  function createDueAtWheels(minutes, compact = false) {
    const m = Number.isFinite(minutes) ? minutes : 9 * 60;
    const hour = createWheel(TIME_OF_DAY_HOURS_OPTIONS, Math.floor(m / 60), "Hour", null, compact);
    const minute = createWheel(TIME_OF_DAY_MINUTES_OPTIONS, m % 60, "Minute", null, compact);
    const read = () => Number(hour.value) * 60 + Number(minute.value);
    return { els: [hour.el, minute.el], read };
  }

  function buildScheduleControls(repeat, values = {}, compact = false) {
    const wrap = document.createElement("div");
    wrap.className = "repeat-schedule";
    const read = {};
    if (repeat === "none") {
      const label = document.createElement("label");
      label.className = "deadline-label";
      label.textContent = "📅 Deadline ";
      const input = document.createElement("input");
      input.type = "datetime-local";
      if (values.deadline) input.value = deadlineInputValue({ deadline: values.deadline });
      label.appendChild(input);
      wrap.appendChild(label);
      read.deadline = () => input.value;
    } else if (repeat === "weekly") {
      const selected = values.repeatWeekdays || [1];
      const group = document.createElement("div");
      group.className = "day-toggle-grid weekday-grid";
      const buttons = WEEKDAY_CHECKBOXES.map(([day, label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "day-toggle";
        btn.textContent = label;
        btn.setAttribute("aria-pressed", String(selected.includes(day)));
        btn.classList.toggle("on", selected.includes(day));
        btn.addEventListener("click", () => {
          const on = btn.classList.toggle("on");
          btn.setAttribute("aria-pressed", String(on));
        });
        group.appendChild(btn);
        return { btn, day };
      });
      wrap.appendChild(group);
      read.repeatWeekdays = () =>
        buttons.filter((b) => b.btn.classList.contains("on")).map((b) => b.day);
    } else if (repeat === "monthly") {
      const weekday = values.repeatMonthlyWeekday ?? null;
      const weekdayGroup = document.createElement("div");
      weekdayGroup.className = "day-toggle-grid weekday-grid";
      const buttons = WEEKDAY_CHECKBOXES.map(([day, label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "day-toggle" + (weekday === day ? " on" : "");
        btn.textContent = label;
        btn.setAttribute("aria-pressed", String(weekday === day));
        btn.addEventListener("click", () => {
          const on = !btn.classList.contains("on");
          for (const b of buttons) {
            b.btn.classList.remove("on");
            b.btn.setAttribute("aria-pressed", "false");
          }
          if (on) {
            btn.classList.add("on");
            btn.setAttribute("aria-pressed", "true");
          }
          setFirstLastEnabled(on);
        });
        weekdayGroup.appendChild(btn);
        return { btn, day };
      });
      wrap.appendChild(weekdayGroup);

      const firstLast = document.createElement("div");
      firstLast.className = "day-toggle-grid first-last-grid";
      const firstBtn = document.createElement("button");
      firstBtn.type = "button";
      firstBtn.className = "day-toggle" + (weekday !== null && values.repeatMonthlyFirst !== false ? " on" : "");
      firstBtn.textContent = "First";
      const lastBtn = document.createElement("button");
      lastBtn.type = "button";
      lastBtn.className = "day-toggle" + (weekday !== null && values.repeatMonthlyFirst === false ? " on" : "");
      lastBtn.textContent = "Last";
      function setFirstLastEnabled(enabled) {
        for (const b of [firstBtn, lastBtn]) {
          b.disabled = !enabled;
          b.classList.toggle("disabled", !enabled);
          if (!enabled) {
            b.classList.remove("on");
            b.setAttribute("aria-pressed", "false");
          }
        }
      }
      firstBtn.setAttribute("aria-pressed", String(weekday !== null && values.repeatMonthlyFirst !== false));
      lastBtn.setAttribute("aria-pressed", String(weekday !== null && values.repeatMonthlyFirst === false));
      firstBtn.addEventListener("click", () => setFirstLast(true));
      lastBtn.addEventListener("click", () => setFirstLast(false));
      function setFirstLast(first) {
        firstBtn.classList.toggle("on", first);
        firstBtn.setAttribute("aria-pressed", String(first));
        lastBtn.classList.toggle("on", !first);
        lastBtn.setAttribute("aria-pressed", String(!first));
      }
      setFirstLastEnabled(weekday !== null);
      firstLast.appendChild(firstBtn);
      firstLast.appendChild(lastBtn);
      wrap.appendChild(firstLast);

      read.repeatMonthlyWeekday = () => {
        const on = buttons.find((b) => b.btn.classList.contains("on"));
        return on ? on.day : null;
      };
      read.repeatMonthlyFirst = () => firstBtn.classList.contains("on");
    } else if (repeat === "custom") {
      const days = createWheel(CUSTOM_DAYS_OPTIONS, values.customDays ?? 1, "Days", null, compact);
      const hours = createWheel(CUSTOM_HOURS_OPTIONS, values.customHours ?? 0, "Hours", null, compact);
      const mins = createWheel(CUSTOM_MINUTES_OPTIONS, values.customMinutes ?? 0, "Minutes", null, compact);
      wrap.appendChild(days.el);
      wrap.appendChild(hours.el);
      wrap.appendChild(mins.el);
      const fromCompLabel = document.createElement("label");
      fromCompLabel.className = "after-completion-label";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = values.repeatCustomFromCompletion === true;
      const span = document.createElement("span");
      span.textContent = "Start counting after completion";
      fromCompLabel.appendChild(cb);
      fromCompLabel.appendChild(span);
      wrap.appendChild(fromCompLabel);
      read.repeatCustomMs = () =>
        (Number(days.value) * 86400 + Number(hours.value) * 3600 + Number(mins.value) * 60) * 1000;
      read.repeatCustomFromCompletion = () => cb.checked;
    }
    return { el: wrap, read };
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

  document.addEventListener("pointerdown", (e) => {
    if (!activeEdit) return;
    if (activeEdit.scope.contains(e.target)) return;
    const current = editValues(activeEdit.input, activeEdit.controls);
    if (current.every((v, i) => v === activeEdit.initial[i])) {
      clearEditing();
      render();
    }
  }, true);

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

  function taskNode(task) {
    const li = document.createElement("li");
    li.className = "task diff-" + (task.difficulty || "fun") + (task.done ? " done" : "");
    li.dataset.id = task.id;
    li.title = task.list === "fun" ? "Fun task" : "Difficulty: " + task.difficulty.replace("_", " ");

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
            gemBalanceEl
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

    body.appendChild(title);
    body.appendChild(meta);
    if (editingThisTask) {
      activateEdit(li, titleInput, pendingEdit.controls, pendingEdit.onSave);
      body.appendChild(buildEditControlsRow());
    }

    const parentLocked = Game.subtasksLockedByChain(task);
    if (task.subtasks.length > 0 || !task.done) {
      const sublist = document.createElement("div");
      sublist.className = "subtask-list" + (parentLocked ? " chain-locked" : "");
      for (const st of chainOrdered(task.subtasks)) {
        if (st.chainedAfter) {
          sublist.appendChild(chainLinkNode("subtask-link-row", () => Game.unchainSubtask(task, st)));
        }
        const row = document.createElement("div");
        row.className = "subtask subtask-row-" + st.id + (st.done ? " done" : "");
        row.dataset.parentId = task.id;
        row.dataset.subtaskId = st.id;
        const stLocked = parentLocked || (!Game.subtaskChainSatisfies(task, st) && !st.done);
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
              coinBalanceEl,
              gemBalanceEl
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
        armDeleteButton(stDel, () => Game.deleteSubtask(task, st.id));
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
    armDeleteButton(del, () => deleteTaskWithConfirm(task));

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
    return li;
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
      repeatCustomFromCompletion: task.repeatCustomFromCompletion,
    };
  }

  function isRepeatingRepeat(repeat) {
    return repeat !== "none" && repeat !== "every_5min";
  }

  function labeledField(labelText, els, hidden = false) {
    const field = document.createElement("div");
    field.className = "labeled-field" + (hidden ? " hidden" : "");
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = labelText;
    field.appendChild(label);
    for (const el of els) field.appendChild(el);
    return field;
  }

  function openEditRow(task) {
    clearEditing();
    editingTaskId = task.id;

    const listSel = createWheel(LIST_OPTIONS, task.list || "todo", "List", onListChange, true);
    const diff = createWheel(DIFFICULTY_OPTIONS, task.difficulty ?? "easy", "Difficulty", null, true);
    const rep = createWheel(REPEAT_OPTIONS, task.repeat, "Repeat", applyRepeatChange, true);
    rep.el.title = task.list === "fun" ? "Fun tasks never repeat" : "";

    const selectors = document.createElement("div");
    selectors.className = "edit-selectors form-row-labeled";
    selectors.appendChild(labeledField("Type", [listSel.el]));
    selectors.appendChild(labeledField("Difficulty", [diff.el]));
    selectors.appendChild(labeledField("Repeat", [rep.el]));

    const scheduleValues = scheduleValuesFromTask(task);
    const scheduleWrap = document.createElement("div");
    scheduleWrap.className = "repeat-schedule edit-schedule";
    let schedule = buildScheduleControls(task.repeat, scheduleValues, true);
    scheduleWrap.appendChild(schedule.el);

    const dueAtWheelsWrap = document.createElement("div");
    dueAtWheelsWrap.className = "due-at-wheels";
    const dueAtField = labeledField("🕔 Due at", [dueAtWheelsWrap], true);
    let dueAt = null;

    const timeLimit = createWheel(TIME_LIMIT_OPTIONS, task.timeLimit || 0, "Time limit", null, true);
    const timeLimitField = labeledField("⏱️ Time limit", [timeLimit.el]);
    const bottomRow = document.createElement("div");
    bottomRow.className = "form-row form-row-labeled edit-bottom-row";
    bottomRow.appendChild(dueAtField);
    bottomRow.appendChild(timeLimitField);

    const afterComp = document.createElement("label");
    afterComp.className = "after-completion-label";
    const afterCompCb = document.createElement("input");
    afterCompCb.type = "checkbox";
    afterCompCb.checked = task.repeatAfterCompletion === true;
    const afterCompText = document.createElement("span");
    afterCompText.textContent = "Time after completion";
    afterComp.appendChild(afterCompCb);
    afterComp.appendChild(afterCompText);

    function onListChange() {
      updateWheelsEnabled();
      applyRepeatChange();
    }

    function effectiveRepeat() {
      return listSel.value === "fun" ? "none" : rep.value;
    }

    function updateWheelsEnabled() {
      const isFun = listSel.value === "fun";
      diff.disabled = isFun || task.subtasks.length > 0;
      rep.disabled = isFun;
      diff.el.title = task.subtasks.length > 0
        ? "Difficulty is derived from the most difficult sub-task"
        : "";
      rep.el.title = isFun ? "Fun tasks never repeat" : "";
    }

    function applyRepeatChange() {
      const repeat = effectiveRepeat();
      if (dueAt) scheduleValues.repeatTime = dueAt.read();
      Object.assign(scheduleValues, readScheduleValues(schedule.read));
      scheduleWrap.innerHTML = "";
      schedule = buildScheduleControls(repeat, scheduleValues, true);
      scheduleWrap.appendChild(schedule.el);
      scheduleWrap.classList.toggle("hidden", schedule.el.childElementCount === 0);
      const showDueAt = scheduleShowsTimeOfDay(repeat);
      dueAtWheelsWrap.innerHTML = "";
      if (showDueAt) {
        dueAt = createDueAtWheels(scheduleValues.repeatTime, true);
        for (const el of dueAt.els) dueAtWheelsWrap.appendChild(el);
      } else {
        dueAt = null;
      }
      dueAtField.classList.toggle("hidden", !showDueAt);
      afterComp.classList.toggle("hidden", !isRepeatingRepeat(repeat));
    }

    updateWheelsEnabled();
    applyRepeatChange();

    pendingEdit = {
      kind: "task",
      controls: [selectors, scheduleWrap, bottomRow, afterComp],
      onSave: (title) => {
        const isFun = listSel.value === "fun";
        const repeat = effectiveRepeat();
        const updates = {
          title,
          repeat,
          list: listSel.value,
          timeLimit: Number(timeLimit.value),
          ...readScheduleValues(schedule.read),
        };
        if (dueAt) updates.repeatTime = dueAt.read();
        if (!isFun) updates.difficulty = diff.value;
        if (isRepeatingRepeat(repeat)) {
          updates.repeatAfterCompletion = afterCompCb.checked;
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
    }

    listEl.classList.toggle("editing", editingTaskId !== null || editingSubtaskKey !== null);
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

  function scheduleShowsTimeOfDay(repeat) {
    return repeat === "daily" || repeat === "weekly" || repeat === "monthly";
  }

  function updateCreateFormMode() {
    if (!listSelect || !difficultySelect || !repeatSelect || !timeLimitSelect) return;
    const isFun = listSelect.value === "fun";
    difficultySelect.disabled = isFun;
    repeatSelect.disabled = isFun;
    timeLimitSelect.disabled = isFun;
    const repeat = isFun ? "none" : repeatSelect.value;
    scheduleContainer.innerHTML = "";
    scheduleControls = buildScheduleControls(repeat, {}, false);
    scheduleContainer.appendChild(scheduleControls.el);
    scheduleContainer.classList.toggle("hidden", scheduleControls.el.childElementCount === 0);
    dueAtWheelsEl.innerHTML = "";
    if (scheduleShowsTimeOfDay(repeat)) {
      dueAtWheelsControls = createDueAtWheels(undefined, false);
      for (const el of dueAtWheelsControls.els) dueAtWheelsEl.appendChild(el);
      dueAtField.classList.remove("hidden");
    } else {
      dueAtWheelsControls = null;
      dueAtField.classList.add("hidden");
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;
    const repeat = listSelect.value === "fun" ? "none" : repeatSelect.value;
    const values = scheduleControls ? readScheduleValues(scheduleControls.read) : {};
    if (dueAtWheelsControls) values.repeatTime = dueAtWheelsControls.read();
    const taskId = Game.addTask(
      title,
      listSelect.value === "fun" ? null : difficultySelect.value,
      repeat,
      values.deadline || "",
      listSelect.value,
      Number(timeLimitSelect.value)
    );
    if (repeat !== "none" && repeat !== "every_5min") {
      Game.editTask(taskId, values);
    }
    taskInput.value = "";
    updateCreateFormMode();
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

  const toggleActionsBtn = document.getElementById("toggle-actions-btn");
  toggleActionsBtn.addEventListener("click", () => {
    const hidden = document.body.classList.toggle("actions-hidden");
    toggleActionsBtn.setAttribute("aria-pressed", String(!hidden));
    toggleActionsBtn.setAttribute(
      "aria-label",
      hidden ? "Show edit and delete buttons" : "Hide edit and delete buttons"
    );
  });
})();
