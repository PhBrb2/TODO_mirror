import { initForm, updateCreateFormMode } from "./app-form.js";
import { render, updateLiveClocks } from "./app-list.js";
import { promptDifficultyRating } from "./app-edit.js";
import { showToast } from "./app-ui.js";
import { initOverlays } from "./app-overlays.js";
import { initActionsToggle, initUiSheet } from "./app-sheet.js";
import { AppUI } from "./app-state.js";
import { DIFFICULTY_OPTIONS, LIST_OPTIONS, REPEAT_OPTIONS, TIME_LIMIT_OPTIONS, mountWheel } from "./app-util.js";
import { VERSION } from "./game-constants.js";
import { rolloverCheckpoints } from "./game-progression.js";
import { checkRecurringTasks } from "./game-schedule.js";
import { loadState, resetState, saveState, state, ui } from "./game-state.js";

ui.render = () => render();
ui.showToast = (message) => showToast(message);
ui.promptDifficultyRating = (task) => promptDifficultyRating(task);

AppUI.els.versionEl.textContent = "v" + VERSION;

const saved = loadState();
if (saved) Object.assign(state, saved);
rolloverCheckpoints();
checkRecurringTasks();
setInterval(checkRecurringTasks, 15000);
setInterval(rolloverCheckpoints, 60000);
setInterval(updateLiveClocks, 1000);

AppUI.els.resetBtn.addEventListener("click", () => {
  if (!confirm("Reset ALL data? This can not be undone.")) return;
  resetState();
  saveState();
  render();
});

AppUI.els.tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (!btn) return;
  AppUI.activeTab = btn.dataset.tab;
  for (const b of AppUI.els.tabsEl.querySelectorAll("button")) {
    b.classList.toggle("active", b === btn);
  }
  render();
});

AppUI.wheels.list = mountWheel("list-wheel", LIST_OPTIONS, "todo", "List", updateCreateFormMode);
AppUI.wheels.diff = mountWheel("difficulty-wheel", DIFFICULTY_OPTIONS, "easy", "Difficulty");
AppUI.wheels.repeat = mountWheel("repeat-wheel", REPEAT_OPTIONS, "none", "Repeat", updateCreateFormMode);
AppUI.wheels.timeLimit = mountWheel("time-limit-wheel", TIME_LIMIT_OPTIONS, 0, "Time limit");

initForm();
initOverlays();
initUiSheet();
initActionsToggle();
updateCreateFormMode();
render();
