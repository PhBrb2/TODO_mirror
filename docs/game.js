import * as constants from "./game-constants.js";
import * as state from "./game-state.js";
import * as schedule from "./game-schedule.js";
import * as progression from "./game-progression.js";
import * as rewards from "./game-rewards.js";
import * as tasks from "./game-tasks.js";
import * as shop from "./game-shop.js";

const Game = {
  ...constants,
  ...state,
  ...schedule,
  ...progression,
  ...rewards,
  ...tasks,
  ...shop,
};

window.Game = Game;

export * from "./game-constants.js";
export * from "./game-state.js";
export * from "./game-schedule.js";
export * from "./game-progression.js";
export * from "./game-rewards.js";
export * from "./game-tasks.js";
export * from "./game-shop.js";
export { Game };
