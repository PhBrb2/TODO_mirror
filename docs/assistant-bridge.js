import { addTask, highlightTasks } from "./game-tasks.js";
import { exportState } from "./game-state.js";
import { ICONS } from "./game-icons.js";

function createTestTask() {
  const title = ICONS.testTube + " Assistant test task";
  const taskId = addTask(title, "easy", "none", null, "todo", 0);
  return { taskId, title };
}

const WIDGET_MAX_ITEMS = 5;

function assistantPlugin() {
  try {
    const plugin = window.Capacitor?.Plugins?.TodoAssistant;
    return plugin && typeof plugin.mirrorState === "function" ? plugin : null;
  } catch {
    return null;
  }
}

// One-way mirror: localStorage -> native DataStore. The WebView stays the
// source of truth; native (widget, app functions) only reads the mirror.
function mirrorStateToNative(stateJson) {
  const plugin = assistantPlugin();
  if (!plugin) return;
  try {
    const widget = JSON.stringify(
      highlightTasks().slice(0, WIDGET_MAX_ITEMS).map((t) => ({ title: t.title, difficulty: t.difficulty ?? null }))
    );
    plugin.mirrorState({ state: stateJson, widget });
  } catch {
    // not running inside the Android app
  }
}

window.todoAssistant = { createTestTask, mirrorStateToNative };
window.__mirrorStateHook = mirrorStateToNative;
// Initial mirror in case saveState already ran before this module loaded.
mirrorStateToNative(exportState());
export { mirrorStateToNative };
