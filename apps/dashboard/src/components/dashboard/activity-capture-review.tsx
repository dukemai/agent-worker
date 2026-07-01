"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityCaptureTemplate } from "@/types/database";
import { createActivitySource } from "./activities-api";

type CapturePayload = {
  schema_version: number;
  capture_id: string;
  url: string;
  canonical_url: string | null;
  title: string;
  captured_at: string;
  capture_mode: "selection" | "page";
  language: string | null;
  html: string;
  text: string;
};

function markdownFromNode(node: Node, baseUrl: string): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return Array.from(node.childNodes).map((child) => markdownFromNode(child, baseUrl)).join("");
  const children = () => Array.from(node.childNodes).map((child) => markdownFromNode(child, baseUrl)).join("");
  const tag = node.tagName.toLowerCase();
  if (tag === "a") {
    const label = children().trim();
    const href = node.getAttribute("href");
    if (!href || !label) return label;
    try { return `[${label}](${new URL(href, baseUrl).href})`; } catch { return label; }
  }
  if (tag === "img") {
    const alt = node.getAttribute("alt")?.trim();
    const src = node.getAttribute("src");
    if (!alt || !src) return "";
    try { return `![${alt}](${new URL(src, baseUrl).href})`; } catch { return ""; }
  }
  if (tag === "br") return "\n";
  if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${children().trim()}\n\n`;
  if (tag === "li") return `- ${children().trim()}\n`;
  if (["p", "div", "section", "article", "main", "ul", "ol", "table", "tr"].includes(tag)) return `${children().trim()}\n\n`;
  if (["td", "th"].includes(tag)) return `${children().trim()} | `;
  return children();
}

function cleanCapture(payload: CapturePayload, template: ActivityCaptureTemplate | null) {
  if (!payload.html) return payload.text;
  const document = new DOMParser().parseFromString(payload.html, "text/html");
  document.querySelectorAll("script,style,noscript,iframe,object,embed,form,input,button,nav,footer,header").forEach((node) => node.remove());
  for (const selector of template?.remove_selectors ?? []) {
    try { document.querySelectorAll(selector).forEach((node) => node.remove()); } catch { /* Keep capture usable when a template selector becomes stale. */ }
  }
  let root: Element | null = null;
  if (payload.capture_mode === "page" && template?.content_selector) {
    try { root = document.querySelector(template.content_selector); } catch { root = null; }
  }
  root ??= document.querySelector("main, article") ?? document.body;
  return markdownFromNode(root, payload.url).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isCapturePayload(value: unknown): value is CapturePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return payload.schema_version === 1 && typeof payload.capture_id === "string" && typeof payload.url === "string" &&
    typeof payload.title === "string" && typeof payload.html === "string" && typeof payload.text === "string" &&
    (payload.capture_mode === "selection" || payload.capture_mode === "page");
}

export function ActivityCaptureReview() {
  const receivedId = useRef<string | null>(null);
  const [payload, setPayload] = useState<CapturePayload | null>(null);
  const [template, setTemplate] = useState<ActivityCaptureTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function receive(event: MessageEvent) {
      if (event.data?.type !== "dad-ops-activity-capture" || !isCapturePayload(event.data.payload)) return;
      const next = event.data.payload;
      try {
        if (new URL(next.url).origin !== event.origin) return;
      } catch { return; }
      if (next.html.length > 500_000 || next.text.length > 500_000 || receivedId.current === next.capture_id) return;
      receivedId.current = next.capture_id;
      setPayload(next);
      setTitle(next.title);
      setSourceUrl(next.canonical_url ?? next.url);
      setError(null);
      let matched: ActivityCaptureTemplate | null = null;
      try {
        const response = await fetch(`/api/activities/capture-templates/match?url=${encodeURIComponent(next.url)}`);
        if (response.ok) matched = ((await response.json()) as { template: ActivityCaptureTemplate | null }).template;
      } catch { /* Generic cleanup remains available when template lookup fails. */ }
      setTemplate(matched);
      setMarkdown(cleanCapture(next, matched));
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  async function submit() {
    if (!payload || !title.trim() || !sourceUrl.trim() || !markdown.trim()) return;
    setSaving(true); setError(null);
    try {
      await createActivitySource({
        title: title.trim(), source_url: sourceUrl.trim(), raw_markdown: markdown.trim(),
        capture_html: payload.html,
        capture_metadata: {
          schema_version: payload.schema_version, capture_id: payload.capture_id, captured_at: payload.captured_at,
          capture_mode: payload.capture_mode, canonical_url: payload.canonical_url, language: payload.language,
        },
        capture_template_id: template?.id ?? null,
        capture_template_version: template?.version ?? null,
      });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to add capture to queue");
    } finally { setSaving(false); }
  }

  if (saved) {
    return <div className="rounded-xl border bg-card p-6"><h1 className="text-xl font-semibold">Added to extraction queue</h1><p className="mt-2 text-sm text-muted-foreground">The captured page is now available in Activity Sources.</p><Button className="mt-4" asChild><a href="/activities">Return to activities</a></Button></div>;
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Capture activity page</h1><p className="text-sm text-muted-foreground">Review captured website content before adding it to the extraction queue.</p></div>
      {!payload ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Waiting for the bookmarklet. Return to the source page and click “Save to Summer Activities.”</div> : (
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{payload.capture_mode === "selection" ? "Selected content" : "Page capture"}</span><span>·</span><span>{template ? `Template: ${template.name} v${template.version}` : "Generic template"}</span></div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Source title" />
          <Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} type="url" placeholder="Source URL" />
          <Textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} rows={20} className="resize-y font-mono text-xs" placeholder="Captured content" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="outline" asChild><a href={payload.url} target="_blank" rel="noreferrer">Open original</a></Button><Button onClick={submit} disabled={saving || !markdown.trim()}>{saving ? "Adding..." : "Add to extraction queue"}</Button></div>
        </div>
      )}
    </div>
  );
}
