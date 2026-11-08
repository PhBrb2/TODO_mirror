import { STORAGE_KEY } from "./game-constants.js";

function readRoomEnabled() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isRecord(data) && isRecord(data.state)) return data.state.roomEnabled !== false;
  } catch {}
  return true;
}

function isRecord(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

if (readRoomEnabled()) {
  import("./room.js");
} else {
  document.body.classList.add("room-disabled");
}
