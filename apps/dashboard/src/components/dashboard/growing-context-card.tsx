"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sprout } from "lucide-react";
import { useState, type FormEvent } from "react";
import { createGrowingProfile, fetchWeeklyGrowing, updateGrowingProfile } from "@/lib/growing-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GrowingProfile } from "@/types/database";
import type { GrowingProfileForm } from "./growing-dashboard.types";
import { toFormState } from "./growing-dashboard.types";

const EMPTY_PROFILE_FORM: GrowingProfileForm = {
  city: "",
  country_code: "SE",
  space_type: "balcony",
  experience_level: "beginner",
  interestsStr: "",
};

const selectInDialogClass = "z-[200]";

export function GrowingContextCard() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const weeklyQuery = useQuery({
    queryKey: ["growing", "weekly"],
    queryFn: fetchWeeklyGrowing,
  });
  const [profileFormDirty, setProfileFormDirty] = useState<GrowingProfileForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profile = weeklyQuery.data?.profile as GrowingProfile | undefined;
  const weekStartDate = weeklyQuery.data?.week_start_date ?? null;
  const profileForm: GrowingProfileForm = profileFormDirty ?? (profile ? toFormState(profile) : EMPTY_PROFILE_FORM);

  const updateProfileMutation = useMutation({
    mutationFn: updateGrowingProfile,
    onSuccess: async () => {
      setProfileFormDirty(null);
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to update growing profile");
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: () => createGrowingProfile(profileForm),
    onSuccess: async () => {
      setProfileFormDirty(null);
      await queryClient.invalidateQueries({ queryKey: ["growing", "weekly"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to create growing profile");
    },
  });

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await updateProfileMutation.mutateAsync(profileForm);
    } catch {
      return;
    }
  }

  async function onCreateProfile() {
    setError(null);
    try {
      await createProfileMutation.mutateAsync();
    } catch {
      return;
    }
  }

  const interestsList =
    profile && Array.isArray((profile as any).interests)
      ? ((profile as any).interests as string[]).filter(Boolean)
      : [];

  const compactSummary = (() => {
    if (!profile) return null;
    const locationParts: string[] = [];
    if (profile.city) locationParts.push(profile.city);
    if (profile.country_code) locationParts.push(profile.country_code);
    const location = locationParts.join(", ");
    const mainParts: string[] = [];
    if (location) mainParts.push(location);
    mainParts.push(profile.space_type);
    mainParts.push(profile.experience_level);
    const summary = mainParts.join(" · ");
    const interestsSummary = interestsList.slice(0, 3).join(", ");
    return interestsSummary ? `${summary} · ${interestsSummary}` : summary;
  })();

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="gap-2">
            <Sprout className="size-4" aria-hidden />
            Growing context
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Growing context</DialogTitle>
          <DialogDescription>
            Your location and interests shape weekly suggestions and knowledge matches.
          </DialogDescription>
        </DialogHeader>

        {weeklyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading growing profile…</p>
        ) : null}
        {weeklyQuery.error instanceof Error ? (
          <p className="text-sm text-red-600">{weeklyQuery.error.message}</p>
        ) : null}

        <form id="growing-context-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="growing-context-city">
              City
            </label>
            <Input
              id="growing-context-city"
              value={profileForm.city}
              onChange={(e) => setProfileFormDirty({ ...profileForm, city: e.target.value })}
              placeholder="Stockholm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="growing-context-country">
              Country code
            </label>
            <Input
              id="growing-context-country"
              value={profileForm.country_code}
              onChange={(e) =>
                setProfileFormDirty({
                  ...profileForm,
                  country_code: e.target.value.toUpperCase().slice(0, 10),
                })
              }
              placeholder="SE"
            />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium" id="growing-context-space-label">
              Space
            </span>
            <Select
              value={profileForm.space_type}
              onValueChange={(value) =>
                setProfileFormDirty({
                  ...profileForm,
                  space_type: value as GrowingProfile["space_type"],
                })
              }
            >
              <SelectTrigger id="growing-context-space" aria-labelledby="growing-context-space-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectInDialogClass}>
                <SelectItem value="balcony">Balcony</SelectItem>
                <SelectItem value="indoor">Indoor</SelectItem>
                <SelectItem value="yard">Yard</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium" id="growing-context-experience-label">
              Experience
            </span>
            <Select
              value={profileForm.experience_level}
              onValueChange={(value) =>
                setProfileFormDirty({
                  ...profileForm,
                  experience_level: value as GrowingProfile["experience_level"],
                })
              }
            >
              <SelectTrigger id="growing-context-experience" aria-labelledby="growing-context-experience-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectInDialogClass}>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="growing-context-interests">
              Interests (comma-separated)
            </label>
            <Input
              id="growing-context-interests"
              value={profileForm.interestsStr}
              onChange={(e) => setProfileFormDirty({ ...profileForm, interestsStr: e.target.value })}
              placeholder="herb, tomato, berry"
            />
          </div>
        </form>

        {weekStartDate ? (
          <p className="text-sm text-muted-foreground">
            Week starting: {new Date(`${weekStartDate}T00:00:00Z`).toLocaleDateString()}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {!profile ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onCreateProfile}
              disabled={createProfileMutation.isPending || weeklyQuery.isLoading}
            >
              {createProfileMutation.isPending ? "Creating…" : "Create profile"}
            </Button>
          ) : null}
          <Button
            type="submit"
            form="growing-context-form"
            disabled={!profile || updateProfileMutation.isPending || weeklyQuery.isLoading}
          >
            {updateProfileMutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      {compactSummary ? (
        <p className="max-w-xs text-xs text-muted-foreground">{compactSummary}</p>
      ) : null}
    </div>
  );
}
