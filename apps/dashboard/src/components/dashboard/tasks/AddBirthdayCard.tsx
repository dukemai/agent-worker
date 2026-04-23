"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBirthday } from "./birthdays-api";
import type { BirthdayCategory } from "@/types/database";

export function AddBirthdayCard() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState<BirthdayCategory>("family");
  const [isRecurring, setIsRecurring] = useState(true);
  const [wishlist, setWishlist] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createBirthday,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["birthdays"] });
      setName("");
      setMonth("1");
      setDay("1");
      setYear("");
      setWishlist("");
      setNotes("");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to record birthday");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({
        name,
        birthday_month: parseInt(month),
        birthday_day: parseInt(day),
        birth_year: year ? parseInt(year) : null,
        category,
        is_recurring: isRecurring,
        wishlist: wishlist || undefined,
        notes: notes || undefined,
      });
    } catch {
      return;
    }
  }

  const setWeekendDay = (targetDay: number, offsetWeeks: number = 0) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    let diff = (targetDay - dayOfWeek + 7) % 7;
    
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + diff + (offsetWeeks * 7));
    
    setMonth((targetDate.getMonth() + 1).toString());
    setDay(targetDate.getDate().toString());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family & Close Circle</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              className="md:col-span-2"
              placeholder="Name (e.g., Anna)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as BirthdayCategory)}
            >
              <option value="family">Family</option>
              <option value="close_friend">Close Friend</option>
            </select>
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="isRecurringCircle"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
              />
              <label htmlFor="isRecurringCircle" className="text-sm font-medium leading-none">
                Recurring yearly
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Month</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMonth((new Date().getMonth() + 1).toString())}
                    className="text-[9px] font-bold uppercase text-emerald-600 hover:underline"
                  >
                    This
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (new Date().getMonth() + 1) % 12 + 1;
                      setMonth(next.toString());
                    }}
                    className="text-[9px] font-bold uppercase text-emerald-600 hover:underline"
                  >
                    Next
                  </button>
                </div>
              </div>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 single-line-shortcuts">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Day</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setWeekendDay(6, 0)}
                    className="text-[9px] font-bold text-emerald-600 hover:underline"
                    title="This Saturday"
                  >
                    Sat
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekendDay(0, 0)}
                    className="text-[9px] font-bold text-emerald-600 hover:underline"
                    title="This Sunday"
                  >
                    Sun
                  </button>
                  <span className="text-[8px] text-muted-foreground/50">|</span>
                  <button
                    type="button"
                    onClick={() => setWeekendDay(6, 1)}
                    className="text-[9px] font-bold text-emerald-600 hover:underline"
                    title="Next Saturday"
                  >
                    +Sat
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekendDay(0, 1)}
                    className="text-[9px] font-bold text-emerald-600 hover:underline"
                    title="Next Sunday"
                  >
                    +Sun
                  </button>
                </div>
              </div>
              <Input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Birth Year</label>
              <Input
                type="number"
                placeholder="Optional"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full min-h-10 bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Recording..." : "Record Birthday"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Wishlist / Gift Ideas</label>
              <Textarea
                placeholder="What do they like?"
                value={wishlist}
                onChange={(e) => setWishlist(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Notes</label>
              <Textarea
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600 font-medium">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
