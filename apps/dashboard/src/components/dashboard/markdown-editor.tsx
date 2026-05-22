"use client";

import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
  readOnly = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <Tabs defaultValue="write" className={className}>
      <TabsList>
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="min-h-72 font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-72 rounded-md border bg-muted/20 px-3 py-2 text-sm">
          {value.trim() ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="mb-2 text-xl font-semibold">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1 last:mb-0">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                a: ({ children, href }) => (
                  <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ),
                code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
                pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded bg-muted p-3 text-xs">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="mb-2 border-l-2 pl-3 text-muted-foreground">{children}</blockquote>
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
