"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Languages, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchIngredientSourceIndex } from "@/components/dashboard/family-recipes-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ingredientSourceMatchesQuery,
  type IngredientSourceLanguage,
} from "@/lib/ingredient-source-index";

const LANGUAGES: IngredientSourceLanguage[] = ["sv", "en", "vi"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function FamilyIngredientSourcesPage() {
  const [search, setSearch] = useState("");
  const ingredientSourcesQuery = useQuery({
    queryKey: ["recipe-ingredient-sources"],
    queryFn: fetchIngredientSourceIndex,
  });

  const index = ingredientSourcesQuery.data;
  const filteredOptions = useMemo(
    () =>
      (index?.options ?? [])
        .filter((option) => ingredientSourceMatchesQuery(option, search))
        .slice(0, 120),
    [index?.options, search],
  );

  const totalProducts = useMemo(
    () => (index?.departments ?? []).reduce((sum, dept) => sum + dept.productCount, 0),
    [index?.departments],
  );

  const error = ingredientSourcesQuery.error instanceof Error ? ingredientSourcesQuery.error.message : null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <Button asChild variant="ghost" className="gap-2">
        <Link href="/recipe-generator">
          <ArrowLeft className="size-4" aria-hidden />
          Recipe library
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Recipe ingredient source admin</CardTitle>
          <CardDescription>
            ICA ingredient source labels and translation coverage for recipe search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredientSourcesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading ingredient sources...</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {index ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Source rows</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{index.sourceCount}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Food departments</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {index.foodDepartmentCount}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Catalog products</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{totalProducts}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs font-medium text-muted-foreground">Generated</div>
                  <div className="mt-1 text-sm font-medium">{formatDate(index.generatedAt)}</div>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Languages className="size-4" aria-hidden />
                  Translation coverage
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {LANGUAGES.map((language) => {
                    const coverage = index.translationCoverage[language];
                    const pct =
                      index.sourceCount > 0
                        ? Math.round((coverage.filled / index.sourceCount) * 100)
                        : 0;
                    return (
                      <div key={language} className="rounded-md bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium uppercase">{language}</span>
                          <span className="text-sm tabular-nums">{pct}%</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {coverage.filled} filled · {coverage.missing} missing
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Card className="border-dashed shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[32rem] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Department</th>
                          <th className="px-3 py-2 text-right font-medium">Sources</th>
                          <th className="px-3 py-2 text-right font-medium">Products</th>
                        </tr>
                      </thead>
                      <tbody>
                        {index.departments.map((department) => (
                          <tr key={department.departmentId} className="border-b last:border-0">
                            <td className="px-3 py-2">{department.departmentName}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {department.itemCount}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {department.productCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Source rows</CardTitle>
                  <CardDescription>Showing the first 120 rows that match the filter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      className="pl-9"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Filter source labels, departments, paths..."
                    />
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[48rem] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Swedish source label</th>
                          <th className="px-3 py-2 text-left font-medium">Department</th>
                          <th className="px-3 py-2 text-left font-medium">EN</th>
                          <th className="px-3 py-2 text-left font-medium">VI</th>
                          <th className="px-3 py-2 text-right font-medium">Products</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOptions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                              No ingredient sources match.
                            </td>
                          </tr>
                        ) : (
                          filteredOptions.map((option) => (
                            <tr key={option.id} className="border-b last:border-0">
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium">{option.labels.sv}</div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {option.categoryPath}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">{option.departmentName}</td>
                              <td className="px-3 py-2 align-top text-muted-foreground">
                                {option.labels.en || "Missing"}
                              </td>
                              <td className="px-3 py-2 align-top text-muted-foreground">
                                {option.labels.vi || "Missing"}
                              </td>
                              <td className="px-3 py-2 text-right align-top tabular-nums">
                                {option.productCount ?? 0}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
