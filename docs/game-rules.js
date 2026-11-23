// Task schedule rules: the deadline / reset / ignore concepts.
// resetRule is wired into the auto-reset (checkRecurringTasks uses
// nextRuleOccurrence when set); deadlineRule/ignoreRule are stored and
// editable in the UI but not yet wired into rewards/urgency behavior.
//
// Rule shapes:
//   deadlineRule: null | { kind: "fixed", slots: [{ weekday: 0-6, time: "HH:MM" }] }   (weekly)
//                        | { kind: "monthly", weekday: 0-6, first: bool, time: "HH:MM" } (monthly)
//                        | { kind: "offset", ms }   (time since last completion)
//   resetRule:    null | { kind: "fixed", slots: [...] } | { kind: "monthly", ... }
//                        | { kind: "offset", ms } (after completion)
//   ignoreRule:   null (no trigger) | { kind: "fixed", slots: [...] } | { kind: "monthly", ... }
// null means "not configured" and keeps previous behavior.

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function normalizeTimeOfDay(v) {
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function timeOfDayToMs(time) {
  const [h, m] = time.split(":").map(Number);
  return (h * 60 + m) * 60000;
}

function normalizeSlot(raw) {
  if (!raw || typeof raw !== "object") return null;
  const weekday = Math.floor(Number(raw.weekday));
  const time = normalizeTimeOfDay(raw.time);
  if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || !time) return null;
  return { weekday, time };
}

function normalizeRule(raw, { allowOffset = true } = {}) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.kind === "none") return null;
  if (raw.kind === "fixed") {
    const slots = Array.isArray(raw.slots)
      ? raw.slots.map(normalizeSlot).filter(Boolean)
      : [];
    return slots.length ? { kind: "fixed", slots } : null;
  }
  if (raw.kind === "monthly") {
    const weekday = Math.floor(Number(raw.weekday));
    const time = normalizeTimeOfDay(raw.time);
    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || !time) return null;
    return { kind: "monthly", weekday, first: raw.first !== false, time };
  }
  if (raw.kind === "offset" && allowOffset) {
    const ms = Math.floor(Number(raw.ms));
    return Number.isFinite(ms) && ms > 0 ? { kind: "offset", ms } : null;
  }
  return null;
}

function daysInMonthOf(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Local copy of the monthly-day helpers (game-schedule.js imports
// game-state.js, which imports this module, so importing back would cycle).
function nthWeekdayOfMonthLocal(year, month, weekday, first) {
  if (weekday === null || weekday === undefined) {
    return new Date(year, month, 1);
  }
  if (first === false) {
    const lastDay = daysInMonthOf(year, month);
    const back = (new Date(year, month, lastDay).getDay() - weekday + 7) % 7;
    return new Date(year, month, lastDay - back);
  }
  const offset = (weekday - new Date(year, month, 1).getDay() + 7) % 7;
  return new Date(year, month, 1 + offset);
}

// Next occurrence of a rule strictly after fromMs. Offset rules are
// relative to fromMs (for deadlines that is "since last completion").
function nextRuleOccurrence(rule, fromMs) {
  if (!rule) return null;
  if (rule.kind === "offset") return fromMs + rule.ms;
  if (rule.kind === "monthly") {
    const base = new Date(fromMs);
    for (let m = 0; m <= 13; m++) {
      const d = nthWeekdayOfMonthLocal(base.getFullYear(), base.getMonth() + m, rule.weekday, rule.first !== false);
      const cand = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() + timeOfDayToMs(rule.time);
      if (cand > fromMs) return cand;
    }
    return null;
  }
  if (rule.kind === "fixed") {
    let best = null;
    for (const slot of rule.slots) {
      const d = new Date(fromMs);
      const addDays = (slot.weekday - d.getDay() + 7) % 7;
      let cand =
        new Date(d.getFullYear(), d.getMonth(), d.getDate() + addDays).getTime() +
        timeOfDayToMs(slot.time);
      if (cand <= fromMs) cand += 7 * 86400000;
      if (best === null || cand < best) best = cand;
    }
    return best;
  }
  return null;
}

export { WEEKDAY_LABELS, nextRuleOccurrence, normalizeRule, normalizeSlot, normalizeTimeOfDay, timeOfDayToMs };
