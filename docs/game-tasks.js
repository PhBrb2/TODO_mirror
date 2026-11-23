import { BONUS_TASK_RATE, CHEST_ITEM_ID, COIN_REWARD, CUSTOM_REPEAT_DEFAULT_MS, DIFFICULTY_ORDER, DIFFICULTY_SUGGESTION_STREAK, FUN_TASK_COINS, FUN_TASK_XP, GOAL_REWARD, HIGHLIGHT_COUNT, REPEAT_VALUES, TASK_LISTS, TIME_LIMIT_MINUTES, WEEKLY_GOAL_REWARD } from "./game-constants.js";
import { normalizeRule } from "./game-rules.js";
import { applyFirstTaskBonus, maybeStartBoost } from "./game-progression.js";
import { achievementProgressFromCompletion, announceAchievements, announceLevelUp, awardSubtask, buildRewardMessage, clawBackMilestone, computeReward, earnChest, grantMilestones, grantXpAndCoins, reachedGoalCount, reachedWeeklyGoalCount, trackAchievement, trackDailyGoal, updateStreak } from "./game-rewards.js";
import { isIgnored, nextDeadlineFor, nextOccurrence, repeatKey } from "./game-schedule.js";
import { clampWeekdays, itemIsOwned, emitPromptDifficultyRating, emitRender, saveState, emitToast, state } from "./game-state.js";
import { hapticImpact, hapticNotification } from "./native-bridge.js";
import { ICONS } from "./game-icons.js";

function highlightRating(task, now) {
  let score = 0;
  if (task.bonus) score += 40;
  if (task.deadline !== null) {
    const hoursLeft = (task.deadline - now) / 3600000;
    if (hoursLeft < 0) score += 50;
    else if (hoursLeft < 48) score += Math.round(40 * (1 - hoursLeft / 48));
  }
  if (task.repeat !== "none" && task.streak > 0) {
    score = Math.min(50, score + 15 + task.streak * 2);
  }
  if (task.difficulty === "hard") score += 10;
  else if (task.difficulty === "medium") score += 5;
  if (task.list === "backlog") score -= 10;
  if (isIgnored(task, now)) score -= 30;
  return score;
}

function highlightTasks() {
  const now = Date.now();
  const candidates = state.tasks
    .filter((t) => !t.done && t.list !== "fun")
    .map((t) => ({ task: t, score: highlightRating(t, now) }))
    .sort((a, b) => b.score - a.score);
  const result = [];
  const countedChains = new Set();
  for (const { task } of candidates) {
    const head = chainHead(state.tasks, task);
    if (countedChains.has(head.id)) continue;
    countedChains.add(head.id);
    const chainTasks = [];
    for (let cur = task; cur && !cur.done; cur = chainPredecessorIn(state.tasks, cur)) {
      chainTasks.unshift(cur);
    }
    for (const t of chainTasks) {
      if (!result.includes(t)) result.push(t);
    }
    if (countedChains.size >= HIGHLIGHT_COUNT) break;
  }
  for (const p of state.tasks) {
    if (p.pinned && !p.done && p.list !== "fun" && !result.includes(p)) result.push(p);
  }
  return result;
}

function addTask(title, difficulty, repeat, deadlineInput, list, timeLimit = 0) {
  const taskList = TASK_LISTS.includes(list) ? list : "todo";
  const isFun = taskList === "fun";
  const isNonTask = isFun || taskList === "group";
  const isBonus = !isNonTask && Math.random() < BONUS_TASK_RATE;
  const task = {
    id: state.nextId++,
    title,
    list: taskList,
    difficulty: isNonTask ? null : difficulty,
    repeat: isNonTask ? "none" : repeat,
    done: false,
    createdAt: Date.now(),
    completedAt: null,
    streak: 0,
    streakDayKeys: [],
    bonus: isBonus,
    deadline: isNonTask ? null : (deadlineInput ? new Date(deadlineInput).getTime() : null),
    deadlineEnabled: true,
    repeatTime: NaN,
    repeatAfterCompletion: false,
    repeatWeekdays: [1],
    repeatMonthlyWeekday: null,
    repeatMonthlyFirst: false,
    repeatCustomMs: CUSTOM_REPEAT_DEFAULT_MS,
    chainedAfter: 0,
    groupId: null,
    deadlineRule: null,
    resetRule: null,
    ignoreRule: null,
    pinned: false,
    streakFreezeKey: null,
    timeLimit: isNonTask ? 0 : (TIME_LIMIT_MINUTES.includes(timeLimit) ? timeLimit : 0),
    startedAt: 0,
    ratedDifficulty: null,
    difficultySuggested: false,
    completedViaSubtasks: false,
    subtasks: [],
  };
  if (isBonus) emitToast(ICONS.star + " New bonus task! Extra rewards");
  state.tasks.push(task);
  saveState();
  emitRender();
  return task.id;
}

function deriveDifficulty(task) {
  if (task.subtasks.length === 0) return task.difficulty;
  let best = "too_easy";
  for (const st of task.subtasks) {
    if (DIFFICULTY_ORDER.indexOf(st.difficulty) > DIFFICULTY_ORDER.indexOf(best)) {
      best = st.difficulty;
    }
  }
  return best;
}

function addSubtask(parentId, title, difficulty) {
  const parent = state.tasks.find((t) => t.id === parentId);
  if (!parent || !title) return;
  parent.subtasks.push({
    id: state.nextId++,
    title,
    difficulty,
    done: false,
    chainedAfter: 0,
  });
  parent.difficulty = deriveDifficulty(parent);
  saveState();
  emitRender();
}

function editSubtask(parent, subtask, title, difficulty) {
  const t = (title || "").trim();
  if (t) subtask.title = t;
  if (difficulty in COIN_REWARD) subtask.difficulty = difficulty;
  parent.difficulty = deriveDifficulty(parent);
  saveState();
  emitRender();
}

function chainPredecessorIn(siblings, item) {
  if (!item.chainedAfter) return null;
  return siblings.find((s) => s.id === item.chainedAfter) || null;
}

function chainSatisfiedIn(siblings, item) {
  const predecessor = chainPredecessorIn(siblings, item);
  return !predecessor || predecessor.done;
}

function chainWouldCycleIn(siblings, item, target) {
  if (target.id === item.id) return true;
  const predecessor = chainPredecessorIn(siblings, target);
  if (!predecessor) return false;
  return chainWouldCycleIn(siblings, item, predecessor);
}

function chainHead(siblings, item) {
  let head = item;
  while (head.chainedAfter) {
    const predecessor = siblings.find((s) => s.id === head.chainedAfter);
    if (!predecessor) break;
    head = predecessor;
  }
  return head;
}

function chainIn(siblings, item, targetId, linkEmoji) {
  if (!item) return { ok: false, reason: "not chainable" };
  const target = siblings.find((s) => s.id === targetId);
  if (!target || target.id === item.id) return { ok: false, reason: "invalid target" };
  if (item.list === "fun" || target.list === "fun") {
    return { ok: false, reason: "fun not chainable" };
  }
  if (item.list !== target.list) {
    return { ok: false, reason: "different lists" };
  }
  if (target.chainedAfter === item.id) return { ok: false, reason: "would swap" };
  if (chainWouldCycleIn(siblings, item, target)) return { ok: false, reason: "cycle" };
  // Re-chaining only moves the item itself; tasks chained after it stay
  // attached to it instead of being re-linked to the new target.
  item.chainedAfter = target.id;
  const headList = chainHead(siblings, item).list;
  for (const other of siblings) {
    if (other.list === "fun") continue;
    if (chainHead(siblings, other) === chainHead(siblings, item)) other.list = headList;
  }
  saveState();
  emitRender();
  emitToast(`${linkEmoji} "${item.title}" is now chained after "${target.title}"`);
  return { ok: true };
}

function unchainIn(siblings, item) {
  if (!item.chainedAfter) return;
  // Successors stay chained to this item (it simply becomes the new head).
  item.chainedAfter = 0;
  saveState();
  emitRender();
}

function subtaskPredecessor(parent, subtask) {
  return chainPredecessorIn(parent.subtasks, subtask);
}

function subtaskChainSatisfies(parent, subtask) {
  return chainSatisfiedIn(parent.subtasks, subtask);
}

function chainSubtask(parent, subtask, targetId) {
  return chainIn(parent.subtasks, subtask, targetId, ICONS.link);
}

function unchainSubtask(parent, subtask) {
  return unchainIn(parent.subtasks, subtask);
}

function deleteSubtask(parent, subtaskId) {
  for (const other of parent.subtasks) {
    if (other.chainedAfter === subtaskId) other.chainedAfter = 0;
  }
  parent.subtasks = parent.subtasks.filter((s) => s.id !== subtaskId);
  parent.difficulty = deriveDifficulty(parent);
  saveState();
  emitRender();
}

function uncompleteSubtaskCascade(parent, subtask) {
  const affected = [subtask];
  const queue = [subtask];
  const seen = new Set([subtask.id]);
  while (queue.length) {
    const cur = queue.shift();
    for (const other of parent.subtasks) {
      if (other.chainedAfter === cur.id && other.done && !seen.has(other.id)) {
        seen.add(other.id);
        affected.push(other);
        queue.push(other);
      }
    }
  }
  for (const st of affected) {
    clawBackReward(st.reward);
    st.reward = null;
    st.done = false;
  }
  return affected;
}

function toggleSubtask(parent, subtask) {
  subtask.done = !subtask.done;
  if (subtask.done) {
    if (subtasksLockedByChain(parent)) {
      subtask.done = false;
      emitToast(ICONS.link + " Finish the chained predecessor task first");
      saveState();
      emitRender();
      return;
    }
    if (!subtaskChainSatisfies(parent, subtask)) {
      subtask.done = false;
      const predecessor = subtaskPredecessor(parent, subtask);
      emitToast(`${ICONS.link} "${subtask.title}" is chained ${ICONS.emDash} complete "${predecessor.title}" first`);
      saveState();
      emitRender();
      return;
    }
    awardSubtask(subtask);
    if (parent.subtasks.every((st) => st.done) && !parent.done) {
      completeTask(parent);
      parent.completedViaSubtasks = true;
    }
  } else {
    uncompleteSubtaskCascade(parent, subtask);
    if (parent.done && parent.completedViaSubtasks) {
      uncompleteTask(parent, false);
      parent.completedViaSubtasks = false;
    }
  }
  saveState();
  emitRender();
}

function startTask(task) {
  if (task.done || !task.timeLimit) return;
  if (task.startedAt && Date.now() - task.startedAt < task.timeLimit * 60000) return;
  task.startedAt = Date.now();
  saveState();
  emitRender();
}

function chainPredecessor(task) {
  return chainPredecessorIn(state.tasks, task);
}

function chainSatisfiesDependency(task) {
  return chainSatisfiedIn(state.tasks, task);
}

function subtasksLockedByChain(task) {
  return Boolean(task.chainedAfter) && !task.done && !chainSatisfiesDependency(task);
}

function chainTask(task, targetId) {
  return chainIn(state.tasks, task, targetId, ICONS.brick);
}

function unchainTask(task) {
  return unchainIn(state.tasks, task);
}

// Manual re-enable (the card's manual label button): just marks the task
// active again - no reward clawback, no streak/milestone changes.
function enableTask(task) {
  if (!task.done) return;
  task.done = false;
  task.completedAt = null;
  saveState();
  emitRender();
}

function moveTaskIntoGroup(taskId, groupId) {
  const task = state.tasks.find((t) => t.id === taskId);
  const group = state.tasks.find((t) => t.id === groupId);
  if (!task || !group || group.list !== "group") return;
  if (task.list === "group" || task.id === groupId || task.groupId === groupId) return;
  task.groupId = groupId;
  saveState();
  emitRender();
}

function completeFunTask(task) {
  task.done = true;
  task.completedAt = Date.now();
  task.reward = { coins: FUN_TASK_COINS, gems: 0, xp: FUN_TASK_XP };
  grantXpAndCoins(FUN_TASK_COINS, 0, FUN_TASK_XP);
  emitToast(`${ICONS.party} +${FUN_TASK_COINS} ${ICONS.coin} +${FUN_TASK_XP} ${ICONS.sparkles}`);
  announceAchievements(trackAchievement({
    totalCompleted: state.achievements.stats.totalCompleted + 1,
    funCompleted: state.achievements.stats.funCompleted + 1,
  }));
  hapticNotification("Success");
  saveState();
  emitRender();
}

function completeTask(task) {
  if (task.list === "fun") return completeFunTask(task);
  if (!chainSatisfiesDependency(task)) {
    emitToast(`${ICONS.brick} "${task.title}" is chained ${ICONS.emDash} complete "${chainPredecessor(task).title}" first`);
    return;
  }
  const reward = computeReward(task);
  task.done = true;
  task.startedAt = 0;
  task.completedAt = Date.now();
  if (task.repeat !== "manual") updateStreak(task, task.completedAt);

  // Checking off a parent also checks off all its subtasks (the user did
  // them all at once). Subtasks already done are left untouched, so the
  // all-subtasks-done path in toggleSubtask does not double-award.
  if (task.subtasks && task.subtasks.length > 0) {
    for (const st of task.subtasks) {
      if (st.done) continue;
      st.done = true;
      awardSubtask(st);
    }
  }

  const firstBonus = applyFirstTaskBonus();
  if (firstBonus) {
    reward.coins += firstBonus.coins;
    reward.gems += firstBonus.gems;
  }

  const chestEarned = Boolean(firstBonus) && itemIsOwned(CHEST_ITEM_ID);
  const chestId = chestEarned ? earnChest() : null;

  const leveledUp = grantXpAndCoins(reward.coins, reward.gems, reward.xp);
  state.dailyCompleted += 1;
  state.weeklyCompleted += 1;
  const milestones = grantMilestones();
  trackDailyGoal();

  task.reward = {
    coins: reward.coins,
    gems: reward.gems,
    xp: reward.xp,
    chestEarned,
    chestId,
    firstTaskDay: firstBonus ? firstBonus.streak : 0,
    timeBonus: reward.timeBonus || 0,
  };

  announceAchievements(trackAchievement(achievementProgressFromCompletion(task, task.completedAt)));
  if (leveledUp) announceLevelUp();
  if (milestones.weeklyReward > 0) {
    emitToast(`${ICONS.trophy} Weekly goal reached! +${WEEKLY_GOAL_REWARD} ${ICONS.coin}`);
  } else if (milestones.dailyReward > 0) {
    emitToast(`${ICONS.party} Daily goal reached! +${GOAL_REWARD} ${ICONS.coin}`);
  }
  emitToast(buildRewardMessage(task, reward, firstBonus));

  if (chestEarned) emitToast(ICONS.chest + " Chest earned! Opens in 12h");
  maybeStartBoost();
  emitPromptDifficultyRating(task);
  maybeSuggestDifficultyReduction(task);
  hapticNotification("Success");
  if (leveledUp) hapticImpact("Heavy");
  saveState();
  emitRender();
}

function clawBackReward(reward) {
  if (!reward) return;
  state.coins = Math.max(0, state.coins - reward.coins);
  state.gems = Math.max(0, state.gems - reward.gems);
  state.xp = Math.max(0, state.xp - reward.xp);
  if (reward.chestEarned) {
    let idx = -1;
    if (reward.chestId !== undefined && reward.chestId !== null) {
      idx = state.chests.findIndex((c) => c.id === reward.chestId);
    }
    if (idx < 0) idx = state.chests.findIndex((c) => !c.opened);
    if (idx >= 0) state.chests.splice(idx, 1);
  }
}

function uncompleteFunTask(task) {
  task.done = false;
  task.completedAt = null;
  clawBackReward(task.reward);
  task.reward = null;
  saveState();
  emitRender();
}

function uncompleteOneTask(task) {
  task.done = false;
  task.startedAt = 0;
  const key = task.completedAt ? repeatKey(task, task.completedAt) : null;
  if (key && task.streakDayKeys.includes(key)) {
    task.streakDayKeys.pop();
    task.streak = Math.max(0, task.streak - 1);
  }
  task.completedAt = null;
  task.streakFreezeKey = null;

  state.dailyCompleted = Math.max(0, state.dailyCompleted - 1);
  state.weeklyCompleted = Math.max(0, state.weeklyCompleted - 1);
  if (task.reward && task.reward.firstTaskDay > 0) {
    state.firstTaskStreak = Math.max(0, task.reward.firstTaskDay - 1);
    state.lastFirstTaskDayKey = null;
  }
  clawBackReward(task.reward);
  task.reward = null;
}

function chainedSuccessorsOf(task) {
  const out = [];
  const queue = [task];
  const seen = new Set([task.id]);
  while (queue.length) {
    const cur = queue.shift();
    for (const other of state.tasks) {
      if (other.chainedAfter === cur.id && other.done && !seen.has(other.id)) {
        seen.add(other.id);
        out.push(other);
        queue.push(other);
      }
    }
  }
  return out;
}

function uncompleteTask(task, cascadeSubtasks = true) {
  if (task.list === "fun") return uncompleteFunTask(task);
  if (cascadeSubtasks && task.subtasks && task.subtasks.length > 0) {
    for (const st of task.subtasks) {
      if (!st.done) continue;
      clawBackReward(st.reward);
      st.reward = null;
      st.done = false;
    }
    task.completedViaSubtasks = false;
  }
  for (const t of [task, ...chainedSuccessorsOf(task)]) uncompleteOneTask(t);
  clawBackMilestone(
    reachedGoalCount(state.dailyCompleted), "lastDailyMilestone", GOAL_REWARD);
  clawBackMilestone(
    reachedWeeklyGoalCount(state.weeklyCompleted), "lastWeeklyMilestone", WEEKLY_GOAL_REWARD);
  saveState();
  emitRender();
}

function deleteTask(id, opts = {}) {
  const deleted = state.tasks.find((t) => t.id === id);
  const isGroup = Boolean(deleted && deleted.list === "group");
  const deleteMembers = isGroup && opts.deleteMembers === true;
  const removedIds = new Set([id]);
  if (deleteMembers) {
    for (const t of state.tasks) if (t.groupId === id) removedIds.add(t.id);
  }
  for (const other of state.tasks) {
    if (removedIds.has(other.chainedAfter)) other.chainedAfter = 0;
    if (isGroup && !deleteMembers && other.groupId === id) other.groupId = null;
  }
  state.tasks = state.tasks.filter((t) => !removedIds.has(t.id));
  saveState();
  emitRender();
}

function setDayStartHour(hour) {
  state.dayStartHour = Math.min(23, Math.max(0, Math.floor(hour)));
  saveState();
  emitRender();
}

function setUiSheetHeightVh(vh) {
  state.uiSheetHeightVh = Math.min(95, Math.max(0, vh));
  saveState();
}

function setRoomEnabled(enabled) {
  state.roomEnabled = !!enabled;
  saveState();
}

function setAutoRemoveCompletedDays(days) {
  state.autoRemoveCompletedDays = Math.max(0, Math.floor(Number(days) || 0));
  saveState();
  purgeOldCompletedTasks();
}

// Remove completed non-repeating tasks older than the configured retention
// (settings option: 30 days). Off when autoRemoveCompletedDays is 0.
function purgeOldCompletedTasks() {
  const days = state.autoRemoveCompletedDays | 0;
  if (days <= 0) return;
  const cutoff = Date.now() - days * 86400000;
  const removed = state.tasks.filter(
    (t) => t.done && t.completedAt && t.repeat === "none" && t.list !== "fun" && t.list !== "group" && t.completedAt <= cutoff
  );
  if (!removed.length) return;
  const removedIds = new Set(removed.map((t) => t.id));
  for (const other of state.tasks) {
    if (removedIds.has(other.chainedAfter)) other.chainedAfter = 0;
    if (other.groupId && removedIds.has(other.groupId)) other.groupId = null;
  }
  state.tasks = state.tasks.filter((t) => !removedIds.has(t.id));
  emitToast(`${ICONS.trash} Removed ${removed.length} completed task${removed.length === 1 ? "" : "s"} older than ${days} days`);
  saveState();
  emitRender();
}

function maybeSuggestDifficultyReduction(task) {
  if (task.difficultySuggested) return;
  if (task.streak < DIFFICULTY_SUGGESTION_STREAK) return;
  if (task.ratedDifficulty === "harder") return;
  task.difficultySuggested = true;
  const order = Object.keys(COIN_REWARD);
  const idx = order.indexOf(task.difficulty);
  if (idx <= 0) return;
  emitToast(
    `${ICONS.bulb} "${task.title}" is going strong (${ICONS.fire} ${task.streak}). Consider lowering its difficulty.`
  );
}

const EDIT_UPDATERS = {
  title(task, v) {
    const t = String(v).trim();
    if (t) task.title = t;
  },
  list(task, v) {
    if (!TASK_LISTS.includes(v) || v === task.list) return;
    task.list = v;
    task.chainedAfter = null;
    for (const st of task.subtasks) st.chainedAfter = null;
    for (const other of state.tasks) {
      if (other.chainedAfter === task.id) other.chainedAfter = null;
    }
  },
  difficulty(task, v) {
    if (v in COIN_REWARD && task.subtasks.length === 0) task.difficulty = v;
  },
  repeat(task, v) {
    if (!REPEAT_VALUES.includes(v)) return;
    task.repeat = v;
    if (v === "none" || v === "manual") {
      task.streak = 0;
      task.streakDayKeys = [];
    }
    if (v === "manual") {
      // manual tasks have no deadline / reset / ignore settings
      task.deadline = null;
      task.deadlineRule = null;
      task.resetRule = null;
      task.ignoreRule = null;
    }
  },
  deadline(task, v) {
    task.deadline = v ? new Date(v).getTime() : null;
  },
  deadlineRule(task, v) {
    task.deadlineRule = normalizeRule(v, { allowOffset: true });
  },
  resetRule(task, v) {
    task.resetRule = normalizeRule(v, { allowOffset: true });
  },
  ignoreRule(task, v) {
    task.ignoreRule = normalizeRule(v, { allowOffset: false });
  },
  repeatAfterCompletion(task, v) {
    task.repeatAfterCompletion = v === true;
  },
  repeatWeekdays(task, v) {
    task.repeatWeekdays = clampWeekdays(v);
  },
  repeatMonthlyWeekday(task, v) {
    task.repeatMonthlyWeekday = v === null
      ? null
      : Math.min(6, Math.max(0, Math.floor(v)));
  },
  repeatMonthlyFirst(task, v) {
    task.repeatMonthlyFirst = v === true;
  },
  repeatCustomMs(task, v) {
    task.repeatCustomMs = Math.max(60000, Math.floor(v));
  },
  timeLimit(task, v) {
    task.timeLimit = TIME_LIMIT_MINUTES.includes(v) ? v : 0;
  },
  pinned(task, v) {
    task.pinned = v === true;
  },
  repeatTime(task, v) {
    task.repeatTime = Number.isFinite(v)
      ? Math.min(1439, Math.max(0, Math.floor(v)))
      : NaN;
  },
  deadlineEnabled(task, v) {
    task.deadlineEnabled = v !== false;
  },
};

function editTask(id, updates) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  for (const key of Object.keys(EDIT_UPDATERS)) {
    if (updates[key] !== undefined) EDIT_UPDATERS[key](task, updates[key]);
  }
  task.startedAt = 0;
  if (task.repeat !== "none" && !task.done) {
    const next = nextDeadlineFor(task, Date.now());
    if (next !== null && next !== Infinity) task.deadline = next;
  }
  saveState();
  emitRender();
}

export { EDIT_UPDATERS, addSubtask, addTask, chainHead, purgeOldCompletedTasks, setAutoRemoveCompletedDays, chainIn, chainPredecessor, chainPredecessorIn, chainSatisfiedIn, chainSatisfiesDependency, chainSubtask, chainTask, chainWouldCycleIn, clawBackReward, completeFunTask, completeTask, deleteSubtask, deleteTask, deriveDifficulty, moveTaskIntoGroup, editSubtask, editTask, enableTask, highlightRating, highlightTasks, maybeSuggestDifficultyReduction, setDayStartHour, setRoomEnabled, setUiSheetHeightVh, startTask, subtaskChainSatisfies, subtaskPredecessor, subtasksLockedByChain, toggleSubtask, unchainIn, unchainSubtask, unchainTask, uncompleteFunTask, uncompleteTask };
