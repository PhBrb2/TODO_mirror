
const VERSION = "0.58.3";

const STORAGE_KEY = "todo-mwe-state";

const SCHEMA_VERSION = 3;

const TIME_LIMIT_MINUTES = [5, 15, 30, 60];

const TIME_BONUS_COINS = { too_easy: 0, easy: 5, medium: 10, hard: 20 };

const COIN_REWARD = { too_easy: 0, easy: 10, medium: 25, hard: 50 };

const DAILY_GOALS = [5, 10, 15, 25];

const GOAL_REWARD = 15;

const GEM_CHANCE = { medium: 0.25, hard: 0.5 };

const GEM_BONUS_AMOUNT = 2;

const MULTIPLIER_MIN = 1;

const MULTIPLIER_MAX = 1.3;

const STREAK_BONUS_START_DAY = 3;

const STREAK_BONUS_PER_DAY = 0.1;

const STREAK_BONUS_MAX = 1.9;

const BONUS_TASK_RATE = 0.15;

const BONUS_TASK_COINS = 10;

const BONUS_TASK_GEMS = 1;

const WEEKLY_GOALS = [10, 20, 30, 50];

const WEEKLY_GOAL_REWARD = 25;

const FIRST_TASK_COINS_MULT = { day1_2: 1, day3_6: 2.5, day7: 3 };

const FIRST_TASK_GEM_CHANCE = { day1_2: 0, day3_6: 0.5, day7: 0.5 };

const RATE_PROMPT_TIMEOUT = 10000;

const DIFFICULTY_SUGGESTION_STREAK = 5;

const XP_REWARD = { too_easy: 10, easy: 50, medium: 120, hard: 250 }; // 10x for debugging

const CONFETTI_COUNT = { too_easy: 12, easy: 24, medium: 48, hard: 80 };

const XP_BASE_LEVEL = 100;

const CHEST_OPEN_MS = 12 * 60 * 60 * 1000;

const CHEST_PURCHASE_OPEN_MS = 60 * 1000;

const CHEST_COINS = [20, 30, 40];

const CHEST_GEMS = [1, 2];

const CHEST_XP = [10, 20];

const SLABS_PER_LEVEL = 4;

const INITIAL_SLABS = 4;

function slabOffsets(count) {
  const cells = [[0, 0], [1, 0], [1, 1], [0, 1]];
  let k = 1;
  while (cells.length < count) {
    k += 1;
    for (let z = 0; z <= k; z++) cells.push([k, z]);
    for (let x = k - 1; x >= 0; x--) cells.push([x, k]);
  }
  return cells.slice(0, count);
}

function slabCountForLevel(level) {
  return INITIAL_SLABS + (Math.max(1, level) - 1) * SLABS_PER_LEVEL;
}

const BOOST_MULT = 1.5;

const BOOST_DURATION_MS = 60 * 60 * 1000;

const BOOST_CHANCE_PER_COMPLETION = 0.1;

const BOOST_COOLDOWN_MS = 2 * 60 * 60 * 1000;

const SHOP_ITEMS = [
  { id: "plant",       name: "Plant",        emoji: "🪴", costCoins: 50,  costGems: 0, minLevel: 1 },
  { id: "table",       name: "Table",        emoji: "🛋", costCoins: 150, costGems: 0, minLevel: 1 },
  { id: "lamp",        name: "Lamp",         emoji: "💡", costCoins: 100, costGems: 0, minLevel: 2 },
  { id: "pedestal",    name: "Chest Pedestal", emoji: "📦", costCoins: 75,  costGems: 0, minLevel: 1 },
];
const ITEM_TYPES = { plant: "top", table: "slab", lamp: "top", pedestal: "slab" };

const CHEST_ITEM_ID = "pedestal";

const ITEM_ROTATIONS = 4;

const PLACEMENT_VERSION = 1;

const DIFFICULTY_ORDER = ["too_easy", "easy", "medium", "hard"];

const REPEAT_VALUES = ["none", "daily", "weekly", "monthly", "every_5min", "custom"];

const CUSTOM_REPEAT_DEFAULT_MS = 86400000;

const TASK_LISTS = ["todo", "backlog", "fun"];

const FUN_TASK_COINS = 5;

const FUN_TASK_XP = 5;

const HIGHLIGHT_COUNT = 4;

const ACHIEVEMENTS = [
  { id: "first_step",  name: "First Step",      emoji: "🏁", hint: "Complete your first task",           goal: 1 },
  { id: "task_master", name: "Task Master",     emoji: "📜", hint: "Complete 25 tasks",                   goal: 25 },
  { id: "streak_3",    name: "On Fire",         emoji: "🔥", hint: "Reach a 3-day streak on a task",      goal: 3 },
  { id: "early_bird",  name: "Early Bird",      emoji: "📅", hint: "Complete 5 tasks before noon",         goal: 5 },
  { id: "night_owl",   name: "Night Owl",       emoji: "🌙", hint: "Complete 5 tasks after 8 PM",          goal: 5 },
  { id: "collector",   name: "Collector",       emoji: "🏰", hint: "Own all 4 room items",                goal: 4 },
  { id: "redecorator", name: "Redecorator",     emoji: "🧱", hint: "Move or rotate room items 10 times",  goal: 10 },
  { id: "fun_lover",   name: "Fun Lover",       emoji: "🎉", hint: "Complete 10 fun tasks",               goal: 10 },
  { id: "weekend_warrior", name: "Weekend Warrior", emoji: "⛱️", hint: "Complete 5 tasks on weekends",     goal: 5 },
  { id: "marathon",    name: "Marathon",         emoji: "🎽", hint: "Complete 100 tasks",                 goal: 100 },
  { id: "chain_gang",  name: "Chain Gang",       emoji: "🧱", hint: "Complete 5 chained tasks",           goal: 5 },
  { id: "bonus_hunter", name: "Bonus Hunter",     emoji: "⭐", hint: "Complete 5 bonus tasks",              goal: 5 },
  { id: "chests_opened", name: "Treasure Hunter", emoji: "📦", hint: "Open 5 chests",                     goal: 5 },
  { id: "goal_getter", name: "Goal Getter",      emoji: "🏆", hint: "Reach 5 daily goals",                 goal: 5 },
  { id: "big_spender", name: "Big Spender",       emoji: "🪙", hint: "Spend 500 coins in the shop",         goal: 500 },
  { id: "decorator",   name: "Decorator",        emoji: "🌿", hint: "Buy your first room item",            goal: 1 },
];
const MORNING_END_HOUR = 12;

const NIGHT_START_HOUR = 20;

export { ACHIEVEMENTS, BONUS_TASK_COINS, BONUS_TASK_GEMS, BONUS_TASK_RATE, BOOST_CHANCE_PER_COMPLETION, BOOST_COOLDOWN_MS, BOOST_DURATION_MS, BOOST_MULT, CHEST_COINS, CHEST_GEMS, CHEST_ITEM_ID, CHEST_OPEN_MS, CHEST_PURCHASE_OPEN_MS, CHEST_XP, COIN_REWARD, CONFETTI_COUNT, CUSTOM_REPEAT_DEFAULT_MS, DAILY_GOALS, DIFFICULTY_ORDER, DIFFICULTY_SUGGESTION_STREAK, FIRST_TASK_COINS_MULT, FIRST_TASK_GEM_CHANCE, FUN_TASK_COINS, FUN_TASK_XP, GEM_BONUS_AMOUNT, GEM_CHANCE, GOAL_REWARD, HIGHLIGHT_COUNT, INITIAL_SLABS, ITEM_ROTATIONS, ITEM_TYPES, MORNING_END_HOUR, MULTIPLIER_MAX, MULTIPLIER_MIN, NIGHT_START_HOUR, PLACEMENT_VERSION, RATE_PROMPT_TIMEOUT, REPEAT_VALUES, SCHEMA_VERSION, SHOP_ITEMS, SLABS_PER_LEVEL, STORAGE_KEY, STREAK_BONUS_MAX, STREAK_BONUS_PER_DAY, STREAK_BONUS_START_DAY, TASK_LISTS, TIME_BONUS_COINS, TIME_LIMIT_MINUTES, VERSION, WEEKLY_GOALS, WEEKLY_GOAL_REWARD, XP_BASE_LEVEL, XP_REWARD, slabCountForLevel, slabOffsets };
