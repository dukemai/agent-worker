import type {
  ScheduledEvent,
  ExecutionContext,
  ForwardableEmailMessage,
} from "@cloudflare/workers-types";
import { handleEmail } from "./handlers/email";
import { handleFetch } from "./handlers/fetch";
import { handleScheduled } from "./handlers/scheduled";
import type { Env } from "./types/env";

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await handleScheduled(event, env, ctx);
  },

  async email(
    message: ForwardableEmailMessage,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    await handleEmail(message, env);
  },

  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    return handleFetch(request, env);
  },
};
