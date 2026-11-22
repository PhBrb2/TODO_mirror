import { addTask } from "./game-tasks.js";
import { ICONS } from "./game-icons.js";

function createTestTask() {
  const title = ICONS.testTube + " Assistant test task";
  const taskId = addTask(title, "easy", "none", null, "todo", 0);
  return { taskId, title };
}

window.todoAssistant = { createTestTask };
