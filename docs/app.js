(() => {
  "use strict";

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
  const levelInlineEl = document.getElementById("level-display-inline");
  const xpProgressEl = document.getElementById("xp-progress");

  let toastTimer = null;
  const toastQueue = [];

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

  function formatHoursMinutes(remaining) {
    const h = Math.floor(remaining / 3600000);
    const m = Math.ceil((remaining % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  function formatMinutesSeconds(remaining) {
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}m ${s}s`;
  }



  function closeExistingEditRows() {
    document.querySelectorAll(".edit-row").forEach((el) => el.remove());
  }

  function buildEditRow(className, title, controls, onSave) {
    closeExistingEditRows();
    const row = document.createElement("div");
    row.className = className;

    const input = document.createElement("input");
    input.type = "text";
    input.value = title;
    input.maxLength = 80;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSave(input.value);
      }
    });

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.addEventListener("click", () => onSave(input.value));

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => row.remove());

    row.appendChild(input);
    for (const control of controls) row.appendChild(control);
    row.appendChild(save);
    row.appendChild(cancel);
    input.focus();
    return row;
  }

  function openSubtaskEditRow(parent, subtask) {
    const diff = buildSelect(DIFFICULTY_OPTIONS, subtask.difficulty);
    const row = buildEditRow(
      "edit-row subtask-edit-row",
      subtask.title,
      [diff],
      (title) => Game.editSubtask(parent, subtask, title, diff.value)
    );
    const subRow = document.querySelector(`[data-id="${parent.id}"] .subtask-row-${subtask.id}`);
    if (subRow && subRow.nextSibling) {
      subRow.parentNode.insertBefore(row, subRow.nextSibling);
    } else {
      document
        .querySelector(`[data-id="${parent.id}"] .subtask-list`)
        .appendChild(row);
    }
    input.focus();
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

  function taskNode(task) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");
    li.dataset.id = task.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = task.done;
    cb.addEventListener("change", () => {
      if (cb.checked) Game.completeTask(task);
      else Game.uncompleteTask(task);
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

    if (task.subtasks.length > 0 || !task.done) {
      const sublist = document.createElement("div");
      sublist.className = "subtask-list";
      for (const st of task.subtasks) {
        const row = document.createElement("div");
        row.className = "subtask subtask-row-" + st.id + (st.done ? " done" : "");
        const scb = document.createElement("input");
        scb.type = "checkbox";
        scb.checked = st.done;
        scb.addEventListener("change", () => Game.toggleSubtask(task, st));
        const stTitle = document.createElement("span");
        stTitle.className = "subtask-title";
        stTitle.textContent = st.title;
        const stEdit = document.createElement("button");
        stEdit.className = "task-edit subtask-edit";
        stEdit.textContent = "✎";
        stEdit.addEventListener("click", () => openSubtaskEditRow(task, st));
        const stBadge = document.createElement("span");
        stBadge.className = "badge " + st.difficulty;
        stBadge.textContent = st.difficulty.replace("_", " ");
        const stDel = document.createElement("button");
        stDel.className = "task-delete subtask-delete";
        stDel.textContent = "✕";
        stDel.addEventListener("click", () => {
          task.subtasks = task.subtasks.filter((s) => s.id !== st.id);
          task.difficulty = Game.deriveDifficulty(task);
          Game.saveState();
          render();
        });
        row.appendChild(scb);
        row.appendChild(stTitle);
        row.appendChild(stBadge);
        row.appendChild(stEdit);
        row.appendChild(stDel);
        sublist.appendChild(row);
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
        addBtn.addEventListener("click", () => {
          const v = addInput.value.trim();
          if (!v) return;
          Game.addSubtask(task.id, v, addDiff.value);
        });
        addInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const v = addInput.value.trim();
            if (v) Game.addSubtask(task.id, v, addDiff.value);
          }
        });
        addRow.appendChild(addInput);
        addRow.appendChild(addDiff);
        addRow.appendChild(addBtn);
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

    const row = buildEditRow(
      "edit-row",
      task.title,
      [diff, rep, dlWrap],
      (title) =>
        Game.editTask(task.id, {
          title,
          difficulty: diff.value,
          repeat: rep.value,
          deadline: dl.value,
        })
    );
    listEl.insertBefore(row, listEl.querySelector(`[data-id="${task.id}"]`).nextSibling);
  }

  let render = function () {
    const sorted = sortTasks(Game.state.tasks);
    listEl.innerHTML = "";
    for (const task of sorted) listEl.appendChild(taskNode(task));

    emptyHint.classList.toggle("hidden", Game.state.tasks.length > 0);
    coinBalanceEl.textContent = Game.state.coins;
    gemBalanceEl.textContent = Game.state.gems;

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

    const level = Game.levelFromXp(Game.state.xp);
    levelDisplayEl.textContent = level;
    levelInlineEl.textContent = level;
    const curLevelXp = Game.levelStartXp(level);
    const nextLevelXp = Game.xpForLevel(level + 1);
    xpProgressEl.textContent =
      `${Game.state.xp - curLevelXp}/${nextLevelXp - curLevelXp} XP`;

    chestAreaEl.innerHTML = "";
    const unopened = Game.state.chests.filter((c) => !c.opened);
    if (unopened.length > 0) {
      const counter = document.createElement("span");
      counter.className = "chest-counter";
      counter.textContent = `📦 ${unopened.length}`;
      chestAreaEl.appendChild(counter);
    }
    const grouped = new Map();
    for (const chest of unopened) {
      const ready = Game.chestReady(chest);
      const key = ready ? "ready" : `locked:${Game.CHEST_OPEN_MS - (Date.now() - chest.earnedAt)}`;
      if (!grouped.has(key)) grouped.set(key, { chest, ready, count: 0 });
      grouped.get(key).count++;
    }
    for (const { chest, ready, count } of grouped.values()) {
      const btn = document.createElement("button");
      btn.type = "button";
      if (ready) {
        btn.className = "chest ready";
        btn.textContent = `📦 Open me!${count > 1 ? ` (x${count})` : ""}`;
        btn.addEventListener("click", () => Game.openChest(chest));
      } else {
        btn.className = "chest waiting";
        btn.disabled = true;
        const remaining = Game.CHEST_OPEN_MS - (Date.now() - chest.earnedAt);
        btn.textContent = `🔒 open in ${formatHoursMinutes(remaining)}${count > 1 ? ` (x${count})` : ""}`;
      }
      chestAreaEl.appendChild(btn);
    }

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

    const unopened = Game.state.chests.filter((c) => !c.opened);
    let idx = 0;
    for (const node of chestAreaEl.querySelectorAll(".chest")) {
      const chest = unopened[idx];
      if (!chest) break;
      const remaining = Game.CHEST_OPEN_MS - (now - chest.earnedAt);
      if (!Game.chestReady(chest) && remaining > 0) {
        node.textContent = `🔒 open in ${formatHoursMinutes(remaining)}`;
      }
      idx++;
    }
  }
  setInterval(updateLiveClocks, 1000);

  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset ALL data? This can not be undone.")) return;
    Game.resetState();
    Game.saveState();
    render();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;
    Game.addTask(title, difficultySelect.value, repeatSelect.value, deadlineInput.value);
    taskInput.value = "";
    taskInput.focus();
  });

  render();
})();
