import * as Game from "./game.js";
import { AppUI } from "./app-state.js";
import { state } from "./game-state.js";
import { chainSubtask, chainTask } from "./game-tasks.js";

const D = AppUI.drag;

const DRAG_HOLD_MS = 1000;

// drag state lives in AppUI.drag (D)

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
  const drag = D.active;
  D.active = null;
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
    const drag = createHoldSession(li, e, onDragStart);
    document.addEventListener("pointermove", drag.onMove, { passive: false });
    document.addEventListener("pointerup", drag.onUp);
    document.addEventListener("pointercancel", drag.cleanup);
  });
}

function createHoldSession(li, e, onDragStart) {
  const startX = e.clientX;
  const startY = e.clientY;
  let armed = false;
  const holdTimer = setTimeout(() => {
    armed = true;
    D.armed = li;
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
    if (!D.active) {
      D.active = onDragStart();
      D.active.sourceNode = li;
      li.classList.add("dragging");
    }
    ev.preventDefault();
    clearDropHighlights();
    const dropEl = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!dropEl) return;
    const target = dropTargetAt(dropEl, D.active);
    const targetRow = target && target.kind === "subtask"
      ? dropEl.closest(".subtask")
      : target
        ? dropEl.closest(".task")
        : null;
    if (targetRow && targetRow !== li) targetRow.classList.add("drop-target");
  };

  const onUp = (ev) => {
    const wasDragging = Boolean(D.active && D.active.sourceNode === li);
    if (wasDragging) finishDrag(ev);
    cleanup();
  };

  const cleanup = () => {
    clearTimeout(holdTimer);
    armed = false;
    if (D.armed === li) D.armed = null;
    li.classList.remove("drag-ready");
    li.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", cleanup);
    if (D.active && D.active.sourceNode === li) finishDrag();
  };

  return { onMove, onUp, cleanup };
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

export { DRAG_HOLD_MS, clearDropHighlights, createHoldSession, dropTargetAt, finishDrag, holdDraggable, subtaskDraggable, taskDraggable  };
