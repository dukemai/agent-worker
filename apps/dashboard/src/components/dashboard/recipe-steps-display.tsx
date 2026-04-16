"use client";

import ReactMarkdown from "react-markdown";

type RecipeStepsDisplayProps = {
  steps: string[];
  className?: string;
};

/**
 * Renders saved recipe steps as markdown inside an ordered list.
 */
export function RecipeStepsDisplay({ steps, className }: RecipeStepsDisplayProps) {
  if (steps.length === 0) {
    return null;
  }
  return (
    <ol className={className ?? "list-decimal space-y-2 pl-5"}>
      {steps.map((s, i) => (
        <li key={`recipe-step-${i}`} className="leading-relaxed marker:font-medium">
          <ReactMarkdown
            components={{
              p: ({ children }) => <span className="block [&:not(:first-child)]:mt-2">{children}</span>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {s}
          </ReactMarkdown>
        </li>
      ))}
    </ol>
  );
}
