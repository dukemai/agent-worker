"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateBirthday } from "./birthdays-api";
import type { Birthday, BirthdayCategory } from "@/types/database";

interface EditBirthdayDialogProps {
  birthday: Birthday | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBirthdayDialog({ birthday, open, onOpenChange }: EditBirthdayDialogProps) {
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

  useEffect(() => {
    if (birthday) {
      setName(birthday.name);
      setMonth(birthday.birthday_month.toString());
      setDay(birthday.birthday_day.toString());
      setYear(birthday.birth_year?.toString() || "");
      setCategory(birthday.category);
      setIsRecurring(birthday.is_recurring);
      setWishlist(birthday.wishlist || "");
      setNotes(birthday.notes || "");
    }
  }, [birthday]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Birthday>) => updateBirthday(birthday!.id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["birthdays"] });
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to update birthday");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!birthday) return;
    
    setError(null);
    try {
      await updateMutation.mutateAsync({
        name,
        birthday_month: parseInt(month),
        birthday_day: parseInt(day),
        birth_year: year ? parseInt(year) : null,
        category,
        is_recurring: isRecurring,
        wishlist: wishlist || null,
        notes: notes || null,
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

  const isInvitation = ["friend", "kid_friend"].includes(category);
  const themeColor = isInvitation ? "pink" : "emerald";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit {isInvitation ? "Invitation" : "Birthday"}</DialogTitle>
          <DialogDescription>
            Update the details for this {isInvitation ? "event" : "person"}.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 py-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Name / Event Title</label>
              <Input
                placeholder="Name or Event"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Category</label>
              <select
                className="rounded-md border px-3 py-2 text-sm h-10"
                value={category}
                onChange={(e) => setCategory(e.target.value as BirthdayCategory)}
              >
                <option value="family">Family</option>
                <option value="close_friend">Close Friend</option>
                <option value="friend">Friend</option>
                <option value="kid_friend">Kid's Friend</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-1 pt-4">
              <input
                type="checkbox"
                id="editIsRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className={`size-4 rounded border-gray-300 text-${themeColor}-600 focus:ring-${themeColor}-600`}
              />
              <label htmlFor="editIsRecurring" className="text-sm font-medium leading-none">
                Recurring
              </label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Month</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMonth((new Date().getMonth() + 1).toString())}
                    className={`text-[9px] font-bold uppercase text-${themeColor}-600 hover:underline`}
                  >
                    This
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (new Date().getMonth() + 1) % 12 + 1;
                      setMonth(next.toString());
                    }}
                    className={`text-[9px] font-bold uppercase text-${themeColor}-600 hover:underline`}
                  >
                    Next
                  </button>
                </div>
              </div>
              <select
                className="rounded-md border px-3 py-2 text-sm h-10"
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
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Day</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setWeekendDay(6, 0)}
                    className={`text-[9px] font-bold text-${themeColor}-600 hover:underline`}
                    title="This Saturday"
                  >
                    Sat
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekendDay(0, 0)}
                    className={`text-[9px] font-bold text-${themeColor}-600 hover:underline`}
                    title="This Sunday"
                  >
                    Sun
                  </button>
                </div>
              </div>
              <Input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-10"
                required
              />
            </div>
            {!isInvitation && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Birth Year</label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-10"
                />
              </div>
            )}
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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              className={isInvitation ? "bg-pink-600 hover:bg-pink-700" : "bg-emerald-600 hover:bg-emerald-700"}
              type="submit" 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
        {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
