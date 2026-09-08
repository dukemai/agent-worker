"use client";

import { AddTaskCard } from "./AddTaskCard";
import { HomeRail } from "./HomeRail";
import { TasksBoard } from "./TasksBoard";

export function TasksDashboard() {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 pb-10 sm:px-8 lg:px-10">
      <header className="flex items-end justify-between gap-6 py-7 sm:py-9">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{today}</p>
          <h1 className="font-serif text-[2rem] leading-none font-medium tracking-tight">Today&apos;s board</h1>
        </div>
        <AddTaskCard />
      </header>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-6">
        <section aria-label="Task board">
          <TasksBoard />
        </section>
        <HomeRail />
      </div>
    </main>
  );
}
