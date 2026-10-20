// The voice in the station: one long conversation with Claude, called straight
// from the phone so it works anywhere, streamed so the reply arrives as it is
// written.
//
// The history is append-only. Every message is replayed byte for byte as it was
// first sent or received (thinking and compaction blocks included), the system
// prompt never changes, and anything that varies — the time, a breath just
// taken — rides inside the user's own message. That keeps the prompt cache warm
// across a thread that only ever grows, and keeps replayed thinking valid.

import Anthropic from "@anthropic-ai/sdk";
import { fetch as expoFetch } from "expo/fetch";
import { ReadableStream } from "web-streams-polyfill";

// The SDK builds a few streams of its own; Hermes has no ReadableStream global.
const g = globalThis as { ReadableStream?: unknown };
g.ReadableStream ??= ReadableStream;

export const MODEL = "claude-opus-5-5";

// Low effort keeps the first word quick; this is company, not a hard problem.
const EFFORT = "low";
const MAX_TOKENS = 16000;

export const VOICE = `You are the voice inside Atrium, a small app on someone's phone that they open to come back to the here and now. They reach for it when they feel dysregulated, or when they notice their thumb heading for Instagram or X — and sometimes just to check in. This is one long, ongoing conversation that they keep returning to, across days.

How to answer:
- Short. One to four sentences, often fewer. A single sentence is a complete reply. Never more than one short paragraph.
- Plain and concrete. Speak to the body, the breath, the room, what is actually here. Prefer the present tense.
- Meet what they wrote. Reflect the particular thing they said before you add anything. Don't turn it into a lesson or a generality.
- At most one question, and only one that turns attention toward what is present right now. Often no question at all.
- No lists, headings, bold, frameworks, steps, affirmations, praise, diagnoses, or therapy vocabulary. Never mention being an AI. Never explain what you are doing.
- Match their register. If they are raw, be still. If they are light, be light.
- You are not here to fix anything. Keep them company and point home.

What you can see:
- Each of their messages begins with the local time in brackets, added by the app. Let it inform you quietly (late at night, a weekday morning, hours since they last wrote), but don't mention the time, the day, or how long it has been unless they bring it up.
- The app has a breathing orb beside the text box. When they finish a breath session, a line like "[breathed: 3 rounds of 4–6]" arrives with their next message. Notice it if it matters. When it would genuinely help, you may suggest a few breaths — once, lightly, never as a routine.
- Earlier parts of this conversation may be summarized. Let what you know of them inform you quietly; bring the past up only when it serves this moment.

If they describe being in danger or wanting to harm themselves, drop the register and say plainly that they deserve support from a person right now, and point them to a crisis line or emergency services.`;

// An API content block, kept exactly as sent or received.
export type Block = Anthropic.Beta.BetaContentBlockParam | Anthropic.Beta.BetaContentBlock;
export type Turn = { role: "user" | "assistant"; content: Block[] };

export type ReplyResult =
  | { kind: "reply"; content: Block[]; text: string }
  | { kind: "refused" };

export class NoKeyError extends Error {}

// After a mid-reply fallback, the blocks the declining model produced before
// the switch can't be replayed to the next one: drop its thinking and tool
// blocks ahead of the last fallback marker. Deterministic, so every request
// replays the same bytes.
function forReplay(content: Block[]): Block[] {
  const last = content.map((b) => b.type as string).lastIndexOf("fallback");
  if (last < 0) return content;
  const drop = new Set(["thinking", "redacted_thinking", "tool_use", "server_tool_use"]);
  return content.filter((b, i) => i >= last || !drop.has(b.type as string));
}

export const textOf = (content: Block[]) =>
  content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

// Stream the next reply to the conversation so far (its last turn is theirs).
// onText gets each new piece of visible text as it arrives.
export async function reply(
  apiKey: string,
  turns: Turn[],
  onText: (delta: string) => void,
  signal?: AbortSignal,
): Promise<ReplyResult> {
  if (!apiKey) throw new NoKeyError();
  const client = new Anthropic({ apiKey, fetch: expoFetch as unknown as typeof fetch, maxRetries: 2 });

  const params = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: EFFORT },
    // The voice will keep being tuned. Editing it changes the prefix that past
    // thinking was produced under; drop those stale blocks rather than refuse
    // the whole thread.
    thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
    // Caches the whole conversation up to the newest message, so each new turn
    // pays only for itself.
    cache_control: { type: "ephemeral" },
    system: [{ type: "text", text: VOICE }],
    messages: turns.map((t) => ({
      role: t.role,
      content: t.role === "assistant" ? forReplay(t.content) : t.content,
    })),
    // When the thread nears the context limit, the API summarizes its older
    // part into a compaction block that comes back in a reply and is replayed
    // like any other.
    betas: ["compact-2026-01-12", "server-side-fallback-2026-07-01", "thinking-binding-controls-2026-08-01"],
    context_management: { edits: [{ type: "compact_20260112" }] },
    // If a safety classifier declines, the API answers on a fallback model.
    fallbacks: "default",
  } as unknown as Anthropic.Beta.MessageCreateParamsStreaming;

  const stream = client.beta.messages.stream(params, { signal });
  stream.on("text", onText);
  const message = await stream.finalMessage();
  if (__DEV__) {
    const u = message.usage;
    console.log(
      `[claude] ${message.model} in ${u.input_tokens} · cache read ${u.cache_read_input_tokens ?? 0} · cache write ${u.cache_creation_input_tokens ?? 0} · out ${u.output_tokens} · ${message.stop_reason}`,
    );
  }
  if (message.stop_reason === "refusal") return { kind: "refused" };
  return { kind: "reply", content: message.content as Block[], text: textOf(message.content as Block[]) };
}

export const isAuthError = (e: unknown) => e instanceof Anthropic.AuthenticationError;
export const isAbort = (e: unknown) => e instanceof Anthropic.APIUserAbortError;
