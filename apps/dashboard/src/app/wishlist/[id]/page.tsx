"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Cake, CheckCircle2, Gift, Loader2, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function WishlistPage() {
  const params = useParams();
  const id = params.id as string;
  const [wishlist, setWishlist] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-wishlist", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/wishlist/${id}`);
      if (!res.ok) throw new Error("Failed to load wishlist");
      const json = await res.json();
      return json.birthday;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.wishlist) {
      setWishlist(data.wishlist);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (newWishlist: string) => {
      const res = await fetch(`/api/public/wishlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlist: newWishlist }),
      });
      if (!res.ok) throw new Error("Failed to save wishlist");
      return res.json();
    },
    onSuccess: () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8">
            <p className="text-red-600 font-medium">Sorry, this invite link is invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4">
            <Cake className="size-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
            Hi {data.name}! <Sparkles className="size-6 text-yellow-500 fill-yellow-500" />
          </h1>
          <p className="mt-2 text-slate-600">
            Your birthday on {new Date(2000, data.birthday_month - 1, data.birthday_day).toLocaleString("default", { month: "long", day: "numeric" })} is coming up!
          </p>
        </div>

        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Gift className="size-5 text-emerald-600" />
              What's on your wishlist?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Let us know what you'd love to get this year. We'll use this to pick the perfect gift!
              </p>
              <Textarea
                placeholder="LEGO, Pokemon cards, a new bike... anything you like!"
                value={wishlist}
                onChange={(e) => setWishlist(e.target.value)}
                className="min-h-[200px] border-emerald-100 focus-visible:ring-emerald-500 text-lg"
              />
            </div>
            
            <Button 
              className={`w-full h-12 text-lg font-bold transition-all ${
                isSaved ? "bg-green-600 hover:bg-green-600" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              onClick={() => updateMutation.mutate(wishlist)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 size-5 animate-spin" />
              ) : isSaved ? (
                <CheckCircle2 className="mr-2 size-5" />
              ) : null}
              {isSaved ? "Wishlist Saved!" : "Update My Wishlist"}
            </Button>
            
            {isSaved && (
              <p className="text-center text-sm font-medium text-green-600 animate-in fade-in slide-in-from-top-1">
                Successfully updated! You can close this page now.
              </p>
            )}
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-slate-400 text-xs">
          Birthday Planning System · Shared Private Link
        </p>
      </div>
    </div>
  );
}
