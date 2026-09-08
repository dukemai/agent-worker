import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarDays,
  calendarDaysBetween,
  deliveryItem,
  formatDailyDigestSubject,
  isDigestSendWorthy,
  isNewOrChanged,
  isReminderMilestone,
  nextMondayDate,
  resolveSummerActivityPhase,
  stockholmDate,
  stockholmHour,
} from "./digest-relevance.ts";

test("Stockholm target date and hour follow daylight saving time", () => {
  const summer = new Date("2026-09-03T04:30:00Z");
  const winter = new Date("2026-01-03T05:30:00Z");
  assert.equal(stockholmDate(summer), "2026-09-03");
  assert.equal(stockholmHour(summer), 6);
  assert.equal(stockholmHour(winter), 6);
});

test("calendar helpers do not depend on runtime timezone", () => {
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(calendarDaysBetween("2026-09-03", "2026-09-10"), 7);
  assert.equal(nextMondayDate("2026-09-06"), "2026-09-07");
  assert.equal(nextMondayDate("2026-09-07"), "2026-09-14");
});

test("unchanged items are suppressed while material changes are eligible", () => {
  const original = deliveryItem("task:1", { title: "Pack bags", due: "2026-09-04" });
  const states = new Map([
    [original.itemKey, { item_key: original.itemKey, content_hash: original.contentHash, last_shown_on: "2026-09-02", show_count: 1 }],
  ]);
  assert.equal(isNewOrChanged(original, states), false);
  assert.equal(isNewOrChanged(deliveryItem("task:1", { title: "Pack bags", due: "2026-09-03" }), states), true);
});

test("reminders appear only at explicit milestones", () => {
  assert.equal(isReminderMilestone(7, [14, 7, 2, 0]), true);
  assert.equal(isReminderMilestone(6, [14, 7, 2, 0]), false);
});

test("summer activities taper after school begins", () => {
  assert.equal(resolveSummerActivityPhase("2026-08-17", "2026-08-18"), "full");
  assert.equal(resolveSummerActivityPhase("2026-08-18", "2026-08-18"), "taper");
  assert.equal(resolveSummerActivityPhase("2026-08-24", "2026-08-18"), "taper");
  assert.equal(resolveSummerActivityPhase("2026-08-25", "2026-08-18"), "essential_only");
  assert.equal(resolveSummerActivityPhase("2026-09-07", "2026-08-18"), "essential_only");
  assert.equal(resolveSummerActivityPhase("2026-09-08", "2026-08-18"), "off");
  assert.equal(resolveSummerActivityPhase("2026-09-08", null), "full");
});

test("quiet days do not send, but a real exception does", () => {
  const quiet = {
    rainForecast: false,
    todayTasks: 0,
    thisWeekTasks: 0,
    renewals: 0,
    birthdays: 0,
    trips: 0,
    activities: 0,
    planningDays: 0,
    growingSuggestions: 0,
    growingKnowledge: 0,
    promotions: 0,
    learningPrograms: 0,
  };
  assert.equal(isDigestSendWorthy(quiet), false);
  assert.equal(isDigestSendWorthy({ ...quiet, learningPrograms: 1 }), true);
  assert.equal(isDigestSendWorthy({ ...quiet, planningDays: 1 }), true);
});

test("daily subject uses calm user-facing wording", () => {
  assert.equal(formatDailyDigestSubject(1, "2026-09-08"), "Dad-Ops: 1 thing for today — 2026-09-08");
  assert.equal(formatDailyDigestSubject(3, "2026-09-08"), "Dad-Ops: 3 things for today — 2026-09-08");
});
