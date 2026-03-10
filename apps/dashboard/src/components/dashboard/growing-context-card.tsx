"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { createGrowingProfile, fetchWeeklyGrowing, updateGrowingProfile } from "@/lib/growing-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function GrowingContextCard() {
  const queryClient = useQueryClient();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growing context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading growing profile...</p> : null}
        {weeklyQuery.error instanceof Error ? (
          <p className="text-sm text-red-600">{weeklyQuery.error.message}</p>
        ) : null}
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
          <div className="space-y-1">
            <label className="text-sm font-medium">City</label>
            <Input
              value={profileForm.city}
              onChange={(e) => setProfileFormDirty({ ...profileForm, city: e.target.value })}
              placeholder="Stockholm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Country code</label>
            <Input
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
            <label className="text-sm font-medium">Space</label>
            <Select
              value={profileForm.space_type}
              onValueChange={(value) =>
                setProfileFormDirty({
                  ...profileForm,
                  space_type: value as GrowingProfile["space_type"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balcony">Balcony</SelectItem>
                <SelectItem value="indoor">Indoor</SelectItem>
                <SelectItem value="yard">Yard</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Experience</label>
            <Select
              value={profileForm.experience_level}
              onValueChange={(value) =>
                setProfileFormDirty({
                  ...profileForm,
                  experience_level: value as GrowingProfile["experience_level"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium">Interests (comma-separated)</label>
            <Input
              value={profileForm.interestsStr}
              onChange={(e) => setProfileFormDirty({ ...profileForm, interestsStr: e.target.value })}
              placeholder="herb, tomato, berry"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving…" : "Save profile"}
            </Button>
            {!profile ? (
              <Button
                type="button"
                variant="outline"
                className="ml-2"
                onClick={onCreateProfile}
                disabled={createProfileMutation.isPending}
              >
                {createProfileMutation.isPending ? "Creating…" : "Create profile"}
              </Button>
            ) : null}
          </div>
        </form>
        {weekStartDate ? (
          <p className="text-sm text-muted-foreground">
            Week starting: {new Date(`${weekStartDate}T00:00:00Z`).toLocaleDateString()}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
