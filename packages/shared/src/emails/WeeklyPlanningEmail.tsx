import { Body, Column, Container, Head, Heading, Html, Preview, Row, Section, Tailwind, Text } from "@react-email/components";
import React from "react";
import type { ActivityDigestItem, BirthdayDigestItem, PlanningDayDigestItem, Task, TripDigestItem } from "../types";

export type WeeklyMealItem = { id: string; title: string };
export type WeeklyShoppingSummary = { title: string; publicSlug: string; remainingItems: number } | null;

export type WeeklyPlanningContent = {
  weekStart: string;
  weekEnd: string;
  tasks: Task[];
  planningDays: PlanningDayDigestItem[];
  birthdays: BirthdayDigestItem[];
  trips: TripDigestItem[];
  activities: ActivityDigestItem[];
  meals: WeeklyMealItem[];
  shopping: WeeklyShoppingSummary;
};

function ItemList({ items }: { items: string[] }) {
  return items.length > 0 ? (
    <Section>
      {items.map((item) => <Text key={item} className="m-0 mb-[7px] text-[14px] leading-[20px] text-gray-700">• {item}</Text>)}
    </Section>
  ) : <Text className="m-0 text-[14px] italic text-gray-400">Nothing planned yet.</Text>;
}

export function WeeklyPlanningEmail({ content, dashboardUrl }: { content: WeeklyPlanningContent; dashboardUrl: string }) {
  return (
    <Html>
      <Tailwind>
        <Head />
        <Preview>Plan the family week: {content.weekStart}–{content.weekEnd}</Preview>
        <Body className="bg-white font-sans text-gray-900">
          <Container className="mx-auto max-w-[600px] px-[10px] py-[20px]">
            <Heading className="m-0 text-[28px] font-bold tracking-tight text-gray-950">The week ahead</Heading>
            <Text className="m-0 mt-[4px] text-[14px] font-medium uppercase tracking-wide text-gray-500">
              {content.weekStart} – {content.weekEnd}
            </Text>
            <Section className="my-[28px] rounded-xl border border-solid border-emerald-100 bg-emerald-50/50 p-[20px]">
              <Heading className="m-0 mb-[12px] text-[18px] font-bold text-emerald-950">Meals & shopping</Heading>
              <ItemList items={content.meals.map((meal) => meal.title)} />
              <Row className="mt-[14px]">
                <Column>
                  <Text className="m-0 text-[13px] text-emerald-800">
                    {content.shopping ? `${content.shopping.remainingItems} items remain on “${content.shopping.title}”.` : "No prepared shopping list yet."}
                  </Text>
                </Column>
              </Row>
              <a href={`${dashboardUrl}/plan-to-cook`} className="mt-[12px] inline-block rounded-md bg-emerald-700 px-[14px] py-[8px] text-[13px] font-bold text-white no-underline">Plan meals & prepare list</a>
            </Section>

            <Section className="mb-[28px] rounded-xl border border-solid border-indigo-100 bg-indigo-50/40 p-[20px]">
              <Heading className="m-0 mb-[12px] text-[18px] font-bold text-indigo-950">Tasks to place in the week</Heading>
              <ItemList items={content.tasks.slice(0, 10).map((task) => `${task.title}${task.due_date ? ` — due ${task.due_date.slice(0, 10)}` : ""}`)} />
              <a href={dashboardUrl} className="mt-[10px] inline-block text-[13px] font-semibold text-indigo-700">Review tasks →</a>
            </Section>

            {(content.planningDays.length > 0 || content.birthdays.length > 0 || content.trips.length > 0) ? (
              <Section className="mb-[28px] rounded-xl border border-solid border-violet-100 bg-violet-50/40 p-[20px]">
                <Heading className="m-0 mb-[12px] text-[18px] font-bold text-violet-950">Family dates</Heading>
                <ItemList items={[
                  ...content.planningDays.map((item) => `${item.title} — ${item.startsOn}`),
                  ...content.birthdays.map((item) => `${item.name}'s birthday — in ${item.daysLeft} days`),
                  ...content.trips.map((item) => `${item.title} — starts in ${item.daysLeft} days`),
                ]} />
              </Section>
            ) : null}

            {content.activities.length > 0 ? (
              <Section className="mb-[28px] rounded-xl border border-solid border-blue-100 bg-blue-50/40 p-[20px]">
                <Heading className="m-0 mb-[12px] text-[18px] font-bold text-blue-950">Favorite activity options</Heading>
                <ItemList items={content.activities.map((item) => `${item.title}${item.dateLabel ? ` — ${item.dateLabel}` : ""}`)} />
                <a href={`${dashboardUrl}/activities`} className="mt-[10px] inline-block text-[13px] font-semibold text-blue-700">View activities →</a>
              </Section>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
