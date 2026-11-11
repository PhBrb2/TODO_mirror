import { addTask } from "./game-tasks.js";

function createTestTask() {
  const title = "🧪 Assistant test task";
  const taskId = addTask(title, "easy", "none", null, "todo", 0);
  return { taskId, title };
}

window.todoAssistant = { createTestTask };
