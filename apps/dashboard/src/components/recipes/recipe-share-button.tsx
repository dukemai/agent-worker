"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createRecipeShare } from "@/components/recipes/recipe-share-api";

export function RecipeShareButton({
  recipeId,
  title,
  size = "sm",
  variant = "outline",
  label = "Share",
  iconOnly = false,
}: {
  recipeId: string;
  title: string;
  size?: "sm" | "icon-sm";
  variant?: "outline" | "secondary" | "ghost";
  label?: string;
  iconOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () =>
      createRecipeShare({
        scopeType: "recipe",
        recipeId,
        title,
      }),
    onSuccess: async (data) => {
      const url = `${window.location.origin}/recipes/shared/${data.link.public_slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      await queryClient.invalidateQueries({ queryKey: ["recipe-shares"] });
    },
  });

  const disabled = shareMutation.isPending;
  const accessibleLabel = copied ? `Copied share link for ${title}` : `Share ${title}`;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={() => void shareMutation.mutateAsync()}
      aria-label={iconOnly ? accessibleLabel : undefined}
      title={shareMutation.error instanceof Error ? shareMutation.error.message : "Create and copy share link"}
    >
      {shareMutation.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Share2 className="size-4" aria-hidden />
      )}
      {iconOnly ? null : <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}
