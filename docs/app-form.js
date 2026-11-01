import * as Game from "./game.js";
import { AppUI } from "./app-state.js";
import { CUSTOM_DAYS_OPTIONS, CUSTOM_HOURS_OPTIONS, CUSTOM_MINUTES_OPTIONS, DIFFICULTY_OPTIONS, LIST_OPTIONS, REPEAT_OPTIONS, TIME_LIMIT_OPTIONS, WEEKDAY_CHECKBOXES, createDueAtWheels, createWheel, deadlineInputValue, isRepeatingRepeat, readScheduleValues } from "./app-util.js";

const W = AppUI.wheels;

function deadlineSchedule(wrap, values, read) {
  const label = document.createElement("label");
  label.className = "deadline-label";
  label.textContent = "\ud83d\udcc5 Deadline ";
  const input = document.createElement("input");
  input.type = "datetime-local";
  if (values.deadline) input.value = deadlineInputValue({ deadline: values.deadline });
  label.appendChild(input);
  wrap.appendChild(label);
  read.deadline = () => input.value;
}

function weekdayToggleGrid(selected) {
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
  return { group, buttons };
}

function weeklySchedule(wrap, values, read) {
  const { group, buttons } = weekdayToggleGrid(values.repeatWeekdays || [1]);
  wrap.appendChild(group);
  read.repeatWeekdays = () =>
    buttons.filter((b) => b.btn.classList.contains("on")).map((b) => b.day);
}

function monthlySchedule(wrap, values, read) {
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
}

function customSchedule(wrap, values, read, compact) {
  const everyLabel = document.createElement("span");
  everyLabel.className = "repeat-every-label";
  everyLabel.textContent = "Repeat every";
  wrap.appendChild(everyLabel);
  const days = createWheel(CUSTOM_DAYS_OPTIONS, values.customDays ?? 1, "Days", null, compact);
  const hours = createWheel(CUSTOM_HOURS_OPTIONS, values.customHours ?? 0, "Hours", null, compact);
  const mins = createWheel(CUSTOM_MINUTES_OPTIONS, values.customMinutes ?? 0, "Minutes", null, compact);
  wrap.appendChild(days.el);
  wrap.appendChild(hours.el);
  wrap.appendChild(mins.el);
  read.repeatCustomMs = () =>
    (Number(days.value) * 86400 + Number(hours.value) * 3600 + Number(mins.value) * 60) * 1000;

  const afterCompLabel = document.createElement("label");
  afterCompLabel.className = "after-completion-label";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = values.repeatAfterCompletion === true;
  const span = document.createElement("span");
  span.textContent = "Start counting after completion";
  afterCompLabel.appendChild(cb);
  afterCompLabel.appendChild(span);
  wrap.appendChild(afterCompLabel);
  read.repeatAfterCompletion = () => cb.checked;
}

const SCHEDULE_BUILDERS = {
  none: deadlineSchedule,
  weekly: weeklySchedule,
  monthly: monthlySchedule,
  custom: customSchedule,
};

function buildScheduleControls(repeat, values = {}, compact = false) {
  const wrap = document.createElement("div");
  wrap.className = "repeat-schedule";
  const read = {};
  const builder = SCHEDULE_BUILDERS[repeat];
  if (builder) builder(wrap, values, read, compact);
  return { el: wrap, read };
}

function scheduleShowsTimeOfDay(repeat) {
  return repeat === "daily" || repeat === "weekly" || repeat === "monthly";
}

function updateCreateFormMode() {
  if (!W.list || !W.diff || !W.repeat || !W.timeLimit) return;
  const isFun = W.list.value === "fun";
  W.diff.disabled = isFun;
  W.repeat.disabled = isFun;
  W.timeLimit.disabled = isFun;
  const repeat = isFun ? "none" : W.repeat.value;
  AppUI.els.scheduleContainer.innerHTML = "";
  AppUI.scheduleControls = buildScheduleControls(repeat, {}, false);
  AppUI.els.scheduleContainer.appendChild(AppUI.scheduleControls.el);
  AppUI.els.scheduleContainer.classList.toggle("hidden", AppUI.scheduleControls.el.childElementCount === 0);
  AppUI.els.dueAtWheelsEl.innerHTML = "";
  AppUI.els.dueAtLabelRow.querySelectorAll(".end-of-day-btn").forEach((b) => b.remove());
  if (scheduleShowsTimeOfDay(repeat)) {
    AppUI.dueAtWheelsControls = createDueAtWheels(undefined, false);
    for (const el of AppUI.dueAtWheelsControls.els) AppUI.els.dueAtWheelsEl.appendChild(el);
    AppUI.els.dueAtLabelRow.appendChild(AppUI.dueAtWheelsControls.endOfDayBtn);
    AppUI.els.dueAtField.classList.remove("hidden");
  } else {
    AppUI.dueAtWheelsControls = null;
    AppUI.els.dueAtField.classList.add("hidden");
  }
}

function initForm() {
  AppUI.els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = AppUI.els.taskInput.value.trim();
    if (!title) return;
    const repeat = W.list.value === "fun" ? "none" : W.repeat.value;
    const values = AppUI.scheduleControls ? readScheduleValues(AppUI.scheduleControls.read) : {};
    if (AppUI.dueAtWheelsControls) values.repeatTime = AppUI.dueAtWheelsControls.read();
    const taskId = Game.addTask(
      title,
      W.list.value === "fun" ? null : W.diff.value,
      repeat,
      values.deadline || "",
      W.list.value,
      Number(W.timeLimit.value)
    );
    if (isRepeatingRepeat(repeat)) {
      Game.editTask(taskId, values);
    }
    AppUI.els.taskInput.value = "";
    updateCreateFormMode();
    AppUI.els.taskInput.focus();
  });
}

export {  SCHEDULE_BUILDERS, buildScheduleControls, customSchedule, deadlineSchedule, initForm, monthlySchedule, scheduleShowsTimeOfDay, updateCreateFormMode, weekdayToggleGrid, weeklySchedule  };
