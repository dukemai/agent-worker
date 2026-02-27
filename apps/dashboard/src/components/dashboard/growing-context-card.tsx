"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GrowingProfile } from "@/types/database";
import type { GrowingProfileForm } from "./growing-dashboard.types";
import type { FormEvent } from "react";

export interface GrowingContextCardProps {
  profileForm: GrowingProfileForm;
  onFormChange: (form: GrowingProfileForm) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  weekStartDate?: string | null;
  error?: string | null;
}

export function GrowingContextCard({
  profileForm,
  onFormChange,
  onSave,
  isSaving,
  weekStartDate,
  error,
}: GrowingContextCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Growing context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSave}>
          <div className="space-y-1">
            <label className="text-sm font-medium">City</label>
            <Input
              value={profileForm.city}
              onChange={(e) => onFormChange({ ...profileForm, city: e.target.value })}
              placeholder="Stockholm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Country code</label>
            <Input
              value={profileForm.country_code}
              onChange={(e) =>
                onFormChange({
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
                onFormChange({
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
                onFormChange({
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
              onChange={(e) => onFormChange({ ...profileForm, interestsStr: e.target.value })}
              placeholder="herb, tomato, berry"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save profile"}
            </Button>
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
