#!/usr/bin/env node
/**
 * repair-build.mjs — self-repair loop for AI-generated pages.
 *
 * AI-written TSX occasionally slips on one-off details the build rejects:
 * invalid CSS props, mistyped signatures, stray imports, or App-Router rule
 * breaks (event handlers in a Server Component that exports `metadata`).
 * Rather than fail generation on a single fixable line, this loops on the FULL
 * `npm run build` (which runs enforce-a2p + tsc + next build + prerender), and on
 * failure feeds the offending file + the exact error back to Claude for a
 * targeted whole-file fix. Comprehensive: catches type, parse, module-not-found,
 * and prerender errors in one loop.
 *
 * Safe: only rewrites files it can map from the error; if it can't, it stops and
 * surfaces the raw output. Idempotent.
 *
 * Usage: node scripts/repair-build.mjs   (from the site repo root)
 * Env: ANTHROPIC_API_KEY required.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const MAX_ROUNDS = 8;
const MODEL = "claude-sonnet-4-6";

function build() {
  try {
    execSync("npm run build", { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out: "" };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ""}\n${e.stderr || ""}` };
  }
}

function routeToFile(route) {
  if (route === "/" || route === "") return "src/app/page.tsx";
  return `src/app${route.replace(/\/$/, "")}/page.tsx`;
}

// Find the offending file + a useful error message from any build output shape.
function parseError(out) {
  // 1. tsc:  src/app/x.tsx(319,17): error TS2353: ...
  let m = out.match(/([^\s(]+\.tsx?)\((\d+),\d+\):\s*(error[^\n]+)/);
  if (m) return { file: m[1], msg: m[3].trim() };
  // 2. next/turbopack:  ./src/app/x.tsx:319:17  (+ a Type error/Module not found/Parsing line)
  m = out.match(/\.?\/?(src\/[^\s:]+\.tsx?):(\d+):\d+/);
  if (m) {
    const msg = (out.match(/(Type error:[^\n]+|Module not found:[^\n]+|Parsing ecmascript[^\n]*)/) || [])[1] || "build error near this location";
    return { file: m[1], msg };
  }
  // 3. enforce-a2p:  src/app/x.tsx:NN — <reason>
  m = out.match(/(src\/[^\s:]+\.tsx?):(\d+)\s+—\s+([^\n]+)/);
  if (m) return { file: m[1], msg: `A2P: ${m[3].trim()}` };
  // 4. prerender:  Error occurred prerendering page "/book"  (+ the reason)
  m = out.match(/prerendering page "([^"]+)"/);
  if (m) {
    const reason = (out.match(/Error:\s*([^\n]+)/) || [])[1] || "prerender error";
    return { file: routeToFile(m[1]), msg: `Prerender: ${reason}` };
  }
  return null;
}

async function fixFile(file, msg) {
  const sdk = await import("@anthropic-ai/sdk");
  const Anthropic = sdk.default || sdk.Anthropic;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const src = readFileSync(file, "utf-8");
  const sys =
    "You fix ONE Next.js 16 (App Router) / React 19 / strict-TypeScript file that failed the build. " +
    "Return the COMPLETE corrected file inside one ```tsx fence, nothing else. Change as little as possible. " +
    "Rules: (1) A page that `export const metadata` is a SERVER component — it CANNOT contain event handlers " +
    "(onClick/onMouseEnter/onMouseLeave/onChange/etc). REMOVE every event handler and replace with plain HTML/CSS: " +
    "an <a href=\"#id\"> instead of onClick scroll, native <form action=...> submit, CSS :hover via className instead of " +
    "onMouseEnter style swaps. (2) NEVER create or import a component/file that does not already exist in this repo " +
    "(do NOT invent @/components/booking-form or similar) — keep everything inline in THIS file. (3) Do NOT add " +
    "\"use client\" to a file that exports metadata. (4) Only valid React.CSSProperties in style={{}} (no focusRingColor). " +
    "(5) Do not add props to prop-less components. (6) Keep all existing copy/sections/SmsConsent intact.";
  const user = `File: ${file}\nBuild error: ${msg}\n\nCurrent content:\n\`\`\`tsx\n${src}\n\`\`\``;
  const r = await client.messages.create({
    model: MODEL, max_tokens: 16000, system: sys, messages: [{ role: "user", content: user }],
  });
  if (r.stop_reason === "max_tokens") throw new Error(`repair of ${file} truncated`);
  const text = r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const fence = text.match(/```(?:tsx|typescript|jsx)?\s*\n([\s\S]*?)\n```/m);
  const fixed = fence ? fence[1] : text.trim();
  if (fixed.length < 50) throw new Error(`repair of ${file} returned implausibly short output`);
  writeFileSync(file, fixed);
}

for (let round = 1; round <= MAX_ROUNDS; round++) {
  const r = build();
  if (r.ok) {
    console.log(`[repair-build] build OK after ${round - 1} repair(s).`);
    process.exit(0);
  }
  const err = parseError(r.out);
  if (!err || !existsSync(err.file)) {
    console.error("[repair-build] unparseable build error — raw tail:");
    console.error(r.out.split("\n").slice(-30).join("\n"));
    process.exit(1);
  }
  if (round === MAX_ROUNDS) {
    console.error(`[repair-build] still failing after ${MAX_ROUNDS} rounds: ${err.file} — ${err.msg}`);
    process.exit(1);
  }
  console.log(`[repair-build] round ${round}: fixing ${err.file} — ${err.msg.slice(0, 110)}`);
  await fixFile(err.file, err.msg);
}
