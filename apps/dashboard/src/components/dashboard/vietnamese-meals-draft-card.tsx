"use client";

import type { VietnameseMealDraft } from "@agent/shared";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { VietnameseMealRow } from "@/lib/vietnamese-meals";

function tagsToText(tags: string[]): string {
  return tags.join(", ");
}

function textToTags(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((s) => s.trim().toLocaleLowerCase("sv-SE"))
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    })
    .slice(0, 12);
}

function ingredientsToText(draft: VietnameseMealDraft): string {
  return draft.typical_ingredients
    .map((row) => `- ${[row.role, row.name, row.name_vi, row.notes].join(" | ")}`)
    .join("\n");
}

function textToIngredients(text: string): VietnameseMealDraft["typical_ingredients"] {
  return text
    .split("\n")
    .map((line) => {
      const cleaned = line
        .trim()
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .replace(/^\|+|\|+$/g, "")
        .trim();
      if (!cleaned || /^[:\-\s|]+$/.test(cleaned)) return null;
      const [roleRaw, nameRaw, nameViRaw, notesRaw] = cleaned.split("|").map((s) => s.trim());
      const role =
        roleRaw === "broth" ||
        roleRaw === "sauce" ||
        roleRaw === "garnish" ||
        roleRaw === "optional" ||
        roleRaw === "main"
          ? roleRaw
          : "main";
      const name = nameRaw || nameViRaw || "";
      if (!name) return null;
      return {
        role,
        name,
        name_vi: nameViRaw ?? "",
        notes: notesRaw ?? "",
      };
    })
    .filter((row): row is VietnameseMealDraft["typical_ingredients"][number] => row !== null)
    .slice(0, 24);
}

export function draftFromMeal(row: VietnameseMealRow): VietnameseMealDraft {
  return {
    name_vi: row.name_vi,
    name_en: row.name_en ?? "",
    summary: row.summary,
    status: row.status,
    region_tags: row.region_tags,
    base_tags: row.base_tags,
    protein_tags: row.protein_tags,
    method_tags: row.method_tags,
    flavor_tags: row.flavor_tags,
    meal_context_tags: row.meal_context_tags,
    typical_ingredients: row.typical_ingredients,
    tourist_notes: row.tourist_notes,
    ai_confidence: row.ai_confidence,
    warnings: [],
  };
}

export function TagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-muted-foreground">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 6).map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function DraftCard({
  draft,
  onChange,
  onRemove,
}: {
  draft: VietnameseMealDraft;
  onChange: (draft: VietnameseMealDraft) => void;
  onRemove?: () => void;
}) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="gap-2 px-6">
        <div className="space-y-5">
          <div className="grid gap-x-3 grid-cols-2">
            <Field label="Vietnamese name">
              <Input
                value={draft.name_vi}
                onChange={(e) => onChange({ ...draft, name_vi: e.target.value })}
                placeholder="Vietnamese name"
              />
            </Field>
            <Field label="English name">
              <Input
                value={draft.name_en}
                onChange={(e) => onChange({ ...draft, name_en: e.target.value })}
                placeholder="English name"
              />
            </Field>
          </div>
          {onRemove ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="w-fit">
              Remove
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-6">
        <Field label="Summary">
          <Textarea
            value={draft.summary}
            onChange={(e) => onChange({ ...draft, summary: e.target.value })}
            rows={2}
            placeholder="Short English summary"
          />
        </Field>
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Typical ingredients markdown
          </span>
          <div className="grid gap-3 lg:grid-cols-2">
            <Textarea
              value={ingredientsToText(draft)}
              onChange={(e) =>
                onChange({ ...draft, typical_ingredients: textToIngredients(e.target.value) })
              }
              rows={8}
              className="font-mono text-sm"
              placeholder={"- main | rice noodles | bún |\n- sauce | fish sauce | nước mắm |"}
            />
            <div className="min-h-36 rounded-md border bg-muted/20 p-3 text-sm">
              {draft.typical_ingredients.length === 0 ? (
                <p className="text-muted-foreground">No ingredients parsed yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="pb-2 font-medium">Role</th>
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Vietnamese</th>
                        <th className="pb-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.typical_ingredients.map((row, index) => (
                        <tr key={`${row.role}-${row.name}-${index}`} className="border-t">
                          <td className="py-2 pr-3 align-top">
                            <Badge variant="outline">{row.role}</Badge>
                          </td>
                          <td className="py-2 pr-3 align-top">{row.name}</td>
                          <td className="py-2 pr-3 align-top">{row.name_vi}</td>
                          <td className="py-2 align-top text-muted-foreground">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-5">
          <Field label="Tourist taste description">
            <Textarea
              value={draft.tourist_notes.taste_description}
              onChange={(e) =>
                onChange({
                  ...draft,
                  tourist_notes: {
                    ...draft.tourist_notes,
                    taste_description: e.target.value,
                  },
                })
              }
              rows={3}
              placeholder="Taste description"
            />
          </Field>
          <Field label="Tourist ordering context">
            <Textarea
              value={draft.tourist_notes.ordering_context}
              onChange={(e) =>
                onChange({
                  ...draft,
                  tourist_notes: {
                    ...draft.tourist_notes,
                    ordering_context: e.target.value,
                  },
                })
              }
              rows={3}
              placeholder="Ordering context"
            />
          </Field>
          <Field label="Allergen hints">
            <Textarea
              value={tagsToText(draft.tourist_notes.allergen_hints)}
              onChange={(e) =>
                onChange({
                  ...draft,
                  tourist_notes: {
                    ...draft.tourist_notes,
                    allergen_hints: textToTags(e.target.value),
                  },
                })
              }
              rows={3}
              placeholder="Allergen hints"
            />
          </Field>
        </div>
        <div className="space-y-2">
          <span className="block text-xs font-medium text-muted-foreground">Tags</span>
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <Field label="Region tags">
              <Input
                value={tagsToText(draft.region_tags)}
                onChange={(e) => onChange({ ...draft, region_tags: textToTags(e.target.value) })}
                placeholder="Regions"
              />
            </Field>
            <Field label="Base tags">
              <Input
                value={tagsToText(draft.base_tags)}
                onChange={(e) => onChange({ ...draft, base_tags: textToTags(e.target.value) })}
                placeholder="Base tags"
              />
            </Field>
            <Field label="Protein tags">
              <Input
                value={tagsToText(draft.protein_tags)}
                onChange={(e) => onChange({ ...draft, protein_tags: textToTags(e.target.value) })}
                placeholder="Protein tags"
              />
            </Field>
            <Field label="Method tags">
              <Input
                value={tagsToText(draft.method_tags)}
                onChange={(e) => onChange({ ...draft, method_tags: textToTags(e.target.value) })}
                placeholder="Methods"
              />
            </Field>
            <Field label="Flavor tags">
              <Input
                value={tagsToText(draft.flavor_tags)}
                onChange={(e) => onChange({ ...draft, flavor_tags: textToTags(e.target.value) })}
                placeholder="Flavors"
              />
            </Field>
            <Field label="Meal context tags">
              <Input
                value={tagsToText(draft.meal_context_tags)}
                onChange={(e) =>
                  onChange({ ...draft, meal_context_tags: textToTags(e.target.value) })
                }
                placeholder="Contexts"
              />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Confidence {Math.round(draft.ai_confidence * 100)}%</span>
          {draft.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
