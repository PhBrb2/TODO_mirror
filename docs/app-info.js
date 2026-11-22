import { AppUI } from "./app-state.js";
import { ICONS } from "./game-icons.js";

const INFO_SECTIONS = [
  {
    heading: ICONS.wave + " How to use",
    items: [
      "Add a task with the input at the bottom, then tap its checkbox to complete it " + ICONS.emDash + " confetti, coins and a short vibration reward you instantly.",
      "Tap the " + ICONS.pencil + " button at the top of the panel to show edit/delete buttons on every task; tap " + ICONS.pencil + " on a task to change its title, list, difficulty, repeat, deadline or time limit.",
      "Hold a task for about a second and drag it onto another task to chain them " + ICONS.brick + ". A chained task only unlocks after the one before it is done; tap the " + ICONS.link + " symbol to remove a link.",
      "Add subtasks below a task to break big tasks into small steps " + ICONS.emDash + " the task completes automatically when all subtasks are done.",
      "Tabs: Highlight shows the most relevant open tasks; Todo and Backlog separate priorities (backlog stays out of the way); Fun tasks give a small fixed reward.",
      "Drag the handle at the top of the panel to resize it. Top-right buttons: info (this page), shop, achievements, settings.",
    ],
  },
  {
    heading: ICONS.sparkles + " Features",
    items: [
      "Difficulty (too easy " + ICONS.arrowRight + " hard) sets the coin/XP reward; deadlines count down and turn red when overdue.",
      "Time limit: press " + ICONS.play + " Start on a task and finish within the limit for a bonus.",
      "Repeat: none, daily, weekly, monthly, custom interval, or a 5-minute test mode " + ICONS.emDash + " optionally at a fixed time of day ('due at 6pm') or an interval after completion.",
      "Streaks " + ICONS.fire + " count consecutive on-time completions of repeating tasks.",
      "Daily/weekly goal bars pay coin bonuses; " + ICONS.star + " marks bonus tasks with extra rewards; " + ICONS.bolt + " is a random 1-hour x1.5 boost after completions.",
      ICONS.chest + " Chests are earned with the first task of the day (buy the chest pedestal in the shop first) and open after a delay.",
      "Spend coins/gems in the shop on room items (plant, table, lamp); your room grows with your level.",
      "Settings: choose when your day starts (daily reset, streaks, first-task bonus).",
    ],
  },
  {
    heading: ICONS.brain + " Why this helps you",
    items: [
      "Chains build habits: they turn 'do A, then B' into one routine (cue " + ICONS.arrowRight + " routine " + ICONS.arrowRight + " reward), so you decide the order once instead of every time.",
      "Streaks and goals use gentle loss aversion " + ICONS.emDash + " a missed day only resets the counter, never your earned progress.",
      "Random gems, chests and boosts are variable rewards " + ICONS.emDash + " the mechanism that keeps games engaging, pointed at your goals.",
      "Subtasks shrink the hardest part: starting. A tiny first step lowers the barrier to begin.",
      "Confetti, coins and vibration give immediate feedback, so finishing a task feels good right away.",
      "The Highlight tab picks a few tasks that fit your energy, saving the willpower of deciding what to do next.",
      "Deadlines create healthy urgency; the backlog keeps 'someday' tasks out of sight until your list is nearly empty.",
      "Your room grows with levels and purchases " + ICONS.emDash + " visible proof of your progress.",
      "Transparency: these mechanics exist to help you finish what matters to you, not to keep you hooked. You can reset everything anytime.",
    ],
  },
];

function infoSectionNode(section) {
  const wrap = document.createElement("div");
  wrap.className = "info-section";
  const h = document.createElement("h3");
  h.textContent = section.heading;
  wrap.appendChild(h);
  if (section.intro) {
    const p = document.createElement("p");
    p.textContent = section.intro;
    wrap.appendChild(p);
  }
  const ul = document.createElement("ul");
  for (const item of section.items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}

function buildInfoContent() {
  const content = AppUI.els.infoContent;
  content.innerHTML = "";
  for (const section of INFO_SECTIONS) content.appendChild(infoSectionNode(section));
}

function initInfoOverlay() {
  const els = AppUI.els;
  const open = () => {
    buildInfoContent();
    els.infoOverlay.classList.remove("hidden");
  };
  const close = () => els.infoOverlay.classList.add("hidden");
  els.infoBtn.addEventListener("click", open);
  els.infoClose.addEventListener("click", close);
  els.infoOverlay.addEventListener("click", (e) => {
    if (e.target === els.infoOverlay) close();
  });
}

export { INFO_SECTIONS, buildInfoContent, infoSectionNode, initInfoOverlay };
