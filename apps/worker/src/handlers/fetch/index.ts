import { handleProcessGrowing } from "./process-growing";
import { handlePostTask } from "./post-task";
import { handleRunDigest } from "./run-digest";
import { handleRunGrowingSuggestions } from "./run-growing-suggestions";
import { handleRunRecipeImportQueue } from "./run-recipe-import-queue";
import { handleRunActivitySourceQueue } from "./run-activity-source-queue";
import type { Env } from "../../types/env";

export async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/run-growing-suggestions" && method === "POST") {
    return handleRunGrowingSuggestions(request, env);
  }
  if (pathname === "/run-digest" && method === "POST") {
    return handleRunDigest(request, env);
  }
  if (pathname === "/run-recipe-import-queue" && method === "POST") {
    return handleRunRecipeImportQueue(request, env);
  }
  if (pathname === "/run-activity-source-queue" && method === "POST") {
    return handleRunActivitySourceQueue(request, env);
  }
  if (pathname === "/process-growing" && method === "POST") {
    return handleProcessGrowing(request, env);
  }
  if (method === "POST") {
    return handlePostTask(request, env);
  }

  return new Response("Dad Agent is live. Send a POST request to test.");
}
