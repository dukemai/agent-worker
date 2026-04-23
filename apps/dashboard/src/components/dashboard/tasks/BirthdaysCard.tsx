"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cake, Calendar, Gift, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchBirthdays, deleteBirthday, updateBirthday } from "./birthdays-api";
import type { Birthday } from "@/types/database";

function getDaysUntil(month: number, day: number): number {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  let target = new Date(Date.UTC(currentYear, month - 1, day));
  
  if (target.getTime() < now.getTime() - 86400000) {
    target = new Date(Date.UTC(currentYear + 1, month - 1, day));
  }
  
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function BirthdaysCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  const birthdaysQuery = useQuery({
    queryKey: ["birthdays"],
    queryFn: () => fetchBirthdays({ status: "active" }),
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteBirthday,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["birthdays"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateBirthday(id, { status: "archived" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["birthdays"] }),
  });

  const createPartyTaskMutation = useMutation({
    mutationFn: async (birthday: Birthday) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Planning: ${birthday.name}'s Birthday Party`,
          bucket: "this_week",
          due_date: new Date(new Date().getUTCFullYear(), birthday.birthday_month - 1, birthday.birthday_day).toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create party task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // If it's a one-time thing, we could archive here too if user wanted
    },
  });

  const birthdays = birthdaysQuery.data ?? [];
  const loading = birthdaysQuery.isLoading;

  const sortedBirthdays = [...birthdays].sort((a, b) => {
    return getDaysUntil(a.birthday_month, a.birthday_day) - getDaysUntil(b.birthday_month, b.birthday_day);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="size-5 text-pink-500" />
          Birthdays & Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading birthdays...</p>}
        {!loading && birthdays.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming birthdays or events saved.</p>
        )}
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedBirthdays.map((item) => {
            const daysLeft = getDaysUntil(item.birthday_month, item.birthday_day);
            const isUrgent = daysLeft <= 14;
            
            return (
              <article
                key={item.id}
                className="relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-none">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(2000, item.birthday_month - 1, item.birthday_day).toLocaleString("default", {
                        month: "long",
                        day: "numeric",
                      })}
                      {item.birth_year ? ` · Born ${item.birth_year}` : ""}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveMutation.mutate(item.id)}>
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={item.category === "kid_friend" ? "secondary" : "outline"} className="text-[10px]">
                    {item.category.replace("_", " ")}
                  </Badge>
                  {daysLeft === 0 ? (
                    <Badge className="bg-pink-500 text-white animate-pulse">Today! 🎂</Badge>
                  ) : (
                    <Badge variant={isUrgent ? "default" : "outline"} className="text-[10px]">
                      {daysLeft} days left
                    </Badge>
                  )}
                </div>

                {item.wishlist && (
                  <div className="rounded bg-muted/50 p-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Wishlist</p>
                    <p className="text-xs line-clamp-2">{item.wishlist}</p>
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => createPartyTaskMutation.mutate(item)}
                    disabled={createPartyTaskMutation.isPending}
                  >
                    <Gift className="mr-2 size-3" />
                    {["kid_friend", "friend"].includes(item.category) ? "Create Party Task" : "Plan Gift Task"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
