# Features to implement in TODO App

Curated from 2_EngagemetFeatures.md
---

#### Currency
- ~~F1: XP~~
  - ~~earned from completing task~~ (1/5/12/25 XP for too easy/easy/medium/hard)
  - ~~can not be spend~~ ~~(XP unlocks shop items at level thresholds)~~
  - unlocks new tiles and items in the shop (which are teased before)
  - ~~items unlock in the shop at level thresholds; tiles (slabs) are added automatically with levels~~ (see Room section)
  - ~~Levels shown in header, level up requires cumulative XP (100 per level * (level+1)/2)~~
  - Level progress below the daily/weekly goal is removed; the level indicator stays in the top right
- ~~F2: Coins~~
  - ~~earned from completing task~~
  - ~~spent on new items~~ and interaction with items
- ~~F3: Gems~~
  - ~~randomly earned from completing tasks~~, can be bought with coins (but expensive)
  - spent on special items, streak freeze, ...
  - 25% chance for 2 gems on medium, 50% chance on hard
- ~~F4: Chests~~
  - ~~earned as daily reward for first completed task~~
  - Chest Pedestal: chests are only earned after buying the pedestal item in the store; the pedestal in the room shows the newest chest - highlighted if it can be opened, plain if still locked, empty if none
  - Buying the pedestal spawns a bonus chest that opens after 1 minute; daily chests keep their 12h delay
  - No chest buttons in the task panel: a countdown ring around the pedestal shrinks with remaining-time/open-delay; tapping the pedestal opens a ready chest
  - ~~contains random coins, gems, items~~ (20-40 coins, 1-2 gems, 10-20 XP; no items yet)
  - ~~opens after 12h~~
  - ~~Chests are opened manually by the user; a counter shows ready and locked chests~~

#### Task 
- ~~F5: Can be created by user~~
- ~~F83: Tasks can be edited (title, difficulty, repeat, deadline)~~
- ~~F6: User can select difficulty too easy, easy, medium, hard~~
- ~~F7: User can select a deadline in hours or as a date~~
- ~~F8: Option for sub-tasks to break down larger tasks (but not further nested)~~
  - Parent and sub-tasks give the same reward: each finished sub-task pays out its coin/XP reward immediately; parent auto-completes (with its own reward) when all sub-tasks are done
  - Unchecking claws back the exact rewarded amounts (coins, gems, XP, goal/weekly bonuses, earned chest); unchecking a sub-task of a completed parent also un-completes and claws back the parent
  - Sub-tasks are editable (title, difficulty)
  - Parent task gets the difficulty of its most difficult sub-task (not editable while sub-tasks exist)
- ~~F9: Option to set a time limit for task. If the user finishes the task within the time after marking it as "task started", the user gets more rewards.~~
- ~~F10: Task can be chained, to promote real life habit building.~~ If tasks in a streak are solved right after another, give x1.2 bonus per task
  - ~~Tasks and subtasks can be chained via hold-and-drag; a chained item is locked until its predecessor is completed~~
  - ~~Chained items stay together in link order, connected by a clickable link~~
- ~~F13: Option for repeating task: user can select when a task returns~~
  - Daily, weekly, monthly
  - MWE test mode: repeat every 5 minutes
  - Completed repeating tasks become available again after their interval elapses
  - ~~F14: Repetitive tasks display a streak, how many times in a row the task was completed before deadline or repetition~~
  - Streaks get removed the moment they fail, not only when the task is completed again
  - F15: "Certificate of Awesomeness" for completing streak milestones, that can be placed in the room. Longer streaks update the one certificate belonging to the task.
    - More fancy visuals for longer streaks
    - If a streak is lost, the visuals become more bland, but you never lose it completely
- ~~F16: Tasks give a coin reward when completed. "Too easy" gives no reward, higher difficulty -> higher reward.~~
  - ~~F17: Random multiplier 1x-1.3x~~
  - ~~F18: Streak bonus: after day 3: 1.1x for every additional day until day 12 (1.9x)~~
  - F19: Random additional gems or item reward on medium and hard.
  - ~~F20: Randomly declare in advance that a task will reward additional gems~~/item
  - ~~F21: User has option to rate difficulty after completion~~
    - Only asked for repeating tasks
  - ~~F22: Very satisfying animation and sound on completion, confetti, banner, fanfare, reward trickeling into coin/gem inventory. It should be fun but not startling.~~
    - ~~Confetti effect originates at the completed task; more difficult tasks produce more confetti~~ (sound, banner and fanfare still pending)
- ~~F23: If streak becomes long without the user reporting it as difficult, suggest reducing its difficulty after completion (after a 5-streak, eg. 5 days for daily, 5 weeks for weekly, without a "harder" rating)~~
- F84: Backlog: user can create tasks with very low priority. They are not shown in the normal task list. When the normal task list is close to empty, suggest adding a task from the backlog.
- ~~F85: For repeating tasks with a bonus reward, the bonus is rerolled every time the task becomes available again.~~
- ~~F86: Option for a custom day start time: the new day starts at a user-chosen time (eg 4am) instead of midnight.~~
  - ~~Applies to daily reset, first task of the day and streak days; selectable under the daily progress (midnight to 6am)~~
- ~~F87: Repeating tasks support a deadline type: a fixed time of day ("at 6pm").~~
- ~~F89: Repeating tasks get an option "time after completion": the task becomes available again one interval after it was completed, instead of the next calendar interval (eg. next Monday).~~
  - ~~When a task is set to repeating, the deadline selector changes to a time-of-day selector~~
  - ~~When the task becomes available again, the new deadline is the next occurrence of that time of day~~
- ~~Sort tasks, always show some easy medium and hard tasks, so the user can easly select one fitting their current energy level. Prioritize tasks that are due soon.~~ Manual override with sticky pin.


#### Milestones/Quests
- ~~F25: Daily task completions: give rewards after 5, 10, 15, 25 completed tasks. Indicate progress prominently~~
  - ~~15 coins per reached daily goal~~
- ~~F26: Weekly task completion: give rewards after 50, 100, 150, 250 completed tasks~~
  - 25 coins per reached weekly goal
  - MWE test mode: goals divided by 5 (10, 20, 30, 50)
- ~~F27: Limited time boost: for 1h increase task completion rewards. Start randomly (consider asking user for times where they can not complete tasks and don't start it there).~~
  - ~~10% chance per completed task to start a 1h x1.5 coin boost, 2h cooldown, countdown banner shown~~
- F28: Could be implemented as clocks integrated into the room (clocks could be bought?)
- F29: Very satisfying animation on completion
- Eg. "3/5 lamps collected"


### Statistics
- F30: Total value of room/number of items/total completed tasks indicators
- F31: Week/Month in review showing completed tasks and room evolution

#### Items
- ~~F32: Can be bought in the store for coins or gems~~
  - ~~3 items with real 3D models (plant 50 / table 150 / lamp 100 coins, lamp gated at level 2), purchasable once each, shown in an overlay with Shop/Owned tabs~~
- F33: Some items take time to completely appear in the room, creating anticipation
- F34: Stay permanently (after app restart) expect for seasonal items
- F35: Moving big things costs coins or needs a task to be completed

#### Persistent memory
- ~~F81: All app state is saved locally in the browser and restored on load~~
- ~~F82: Saved data carries a schema version; older data is migrated, corrupt or newer-schema data falls back to a fresh state~~
- ~~F88: MWE test mode: button to reset all data (with confirmation prompt)~~


#### Skills
- F36: Can be bought for gems
- Eg. "send notification when pet is there", "send notification when limited time boost has started"


#### Streak freeze
- F37: protects a streak for a day
- F38: Can be bought with gems to protect one streak, all streaks or all streaks for a user specified time (eg. for when the user is on vacation)
  - Notification when multi day freeze is over
- F39: Option to automaticly freeze a streak if it would have been lost 


#### Notifications
- F40: Ask user whats the maximum amount of notifications they want per day. Option for flexible limit for important streaks.
- F41: When tasks are due soon
- F42: When a streak is in danger (except for daily tasks)
- F43: When a special event started (but not always, sometimes just set the notification number on the app, be transparent about this, so the user checks the app on their own). Sometimes leave out what has happened to increase curiosity.
- F44: Encouragements "You are doing great", "Just 3 tasks left for ..."
- F45: When a delayed event has completed (eg. chest). Sometimes don't mention what has happened in the notification to increase curiosity.
- F46: Inactivity: Day 1, 3, 7, 14
- F47: Always have to be positive and welcoming. Completing tasks in real life is already overwhelming

#### Companion
- F48: Eg. a cat
- F49: Very cute, can be pet/interacted
- F50: Can be customized, eg collar
- F51: Needs some care, can be completed by coins or completing tasks
  - Eg "go for a walk" requires you to finish a task. "Feed" needs coins.
- F52: Gives 2x bonus for one task if the user hasn't done much recently
- F53: Gives supportive messages
- F54: Can cause cute trouble in the room that needs more care (eg knocking over plant)
- F55: Can help with things in the room that need care, but struggles with it

#### Boost
- F56: User can buy reward boost for gems in the shop, to eg. motivate them for a productive weekend

#### Photo mode
- F57: Photo/video mode, fullscreen and no UI, so that users can share nice pictures/videos of their room

#### Gifts
- F58: Users can buy (random) gifts in the shop, that they send to friends (sender can select difficulty)
- F59: On receiver side it gets attached to a task and can only be opened after finishing the task
- Implementation difficult without a server, could be done with code sharing, hash checking, keeping lists of what has been bought and received.


#### Events
- F60: Eg neighbours cat could visit
  - Just as cute as Companion
  - Brings 1.5x reward bonus for 1h
  - visits more likely after a task has been completed
- F61: Seasonal items
  - disappear after season
- F62: Partially rotating items in shop? Increases engagement, but is annoying. 

#### First task of the day
- ~~F63: Streak:~~
  - ~~Day 1-2: coins~~
  - ~~Day 2: coin~~
  - ~~Day 3-6: 2.5x coins + chance for gem~~
  - ~~Day 7+: 3x coins + chance for gem~~


#### Small achievements
- Eg.:
  - **F64: Task Master:** Complete X tasks
  - **F65: Streak Champion:** Maintain X-day streak
  - **F66: Early Bird:** Complete tasks before noon
  - **F67: Night Owl:** Complete tasks after 8 PM
  - **F68: Weekend Warrior:** Complete tasks on weekends
  - **F69: Perfectionist:** 100% task completion rate for a week
  - **F70: Collector:** Own X decorations
  - **F71: Redecorator:** Move items around X times
- No reward, just shown somewhere

#### Room
- ~~2.5D room view (three.js): warm lighting with soft shadows, sunbeam with drifting dust, subtle bloom; pan (drag / one finger) and zoom (wheel / pinch), scene center kept in the viewport~~
- ~~Room grows with levels: 4 slabs at level 1, +4 per level, placed in Rosenberg strong-pairing order (positive coordinates, 2x2 core, square-ring expansion) - always one connected island~~
- ~~Purchased items appear in the room automatically (table on the anchor slab, plant and lamp on the table, lamp carries a warm light)~~
- ~~F72: Items can be placed in a virtual room to decorate it~~
- F73: Has treasure room showing coins, gems, chest
- ~~F74: Can be redecorated~~
- F75: Companion walks around
- F76: Needs (very little) care

#### Transparency
- F77: Psychological mechanics that can be used to improve real life task completion should be taught
  - Eg. habit building or breaking down big tasks


#### Design goals
- F78: Friction reduction: minimal clicking for actions and automation to avoid unnecessary clicking


#### Onboarding
- F79: Short tutorial
- F80: Ask if all features should be shown right away or if tutorial should show one per day to avoid overwhelming




---

*Document Status: Draft*
*Author: Human*
