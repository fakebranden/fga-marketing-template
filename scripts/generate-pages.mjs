#!/usr/bin/env node
/**
 * generate-pages.mjs — Phase 5e Agent SDK driver for FGA Pro Max.
 *
 * Composes per-page Claude system prompts from:
 *   1. The fga-pro-max skill block (tokens + niche reasoning + recipes +
 *      AEO baseline + A2P enforcement contract)
 *   2. The page-specific contract from prompts/<page>.md
 * …then runs Claude Sonnet 4.6 via @anthropic-ai/sdk per page, writes the
 * generated TSX to src/app/<route>/page.tsx, and emits status PATCHes
 * back to the hub via HUB_RPC_SECRET-authenticated curl.
 *
 * Usage:
 *   node scripts/generate-pages.mjs <site.json-path>
 *
 * Env required:
 *   ANTHROPIC_API_KEY        — Sonnet API key
 *   HUB_BASE                  — e.g. https://gisele.flyinggoatagency.com
 *   HUB_RPC_SECRET            — for hub status PATCH callbacks
 *   FGA_PRO_MAX_SKILL_DIR     — path to fga-pro-max-skill checkout
 *
 * Token budget enforced per substrate (from docs/ARCHITECTURE.md):
 *   tokens ≤ 2,000  ·  reasoning ≤ 3,000  ·  recipe ≤ 1,000
 *
 * Exit codes:
 *   0  — all pages generated, hub PATCHed status=deploying
 *   1  — any page failed (PATCHes status=failed before exit)
 *   2  — bad CLI args
 *   3  — missing env (ANTHROPIC_API_KEY etc.)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const sitePath = process.argv[2];
if (!sitePath) {
  console.error("Usage: node scripts/generate-pages.mjs <site.json-path>");
  process.exit(2);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[generate-pages] missing env: ANTHROPIC_API_KEY");
  process.exit(3);
}

const HUB_BASE = process.env.HUB_BASE || "https://gisele.flyinggoatagency.com";
const HUB_RPC_SECRET = process.env.HUB_RPC_SECRET || "";
const SKILL_DIR =
  process.env.FGA_PRO_MAX_SKILL_DIR || join(ROOT, "..", "fga-pro-max-skill");

const site = JSON.parse(readFileSync(sitePath, "utf-8"));
const brandConfigPath = join(ROOT, "brand-config.json");
const brand = JSON.parse(readFileSync(brandConfigPath, "utf-8"));

if (site.brand) Object.assign(brand, site.brand);
if (site.niche) brand.niche = site.niche;
if (site.reference_style) brand.reference_style = site.reference_style;
if (site.reference_style_url) brand.reference_style_url = site.reference_style_url;

writeFileSync(brandConfigPath, JSON.stringify(brand, null, 2));
console.log(
  `[generate-pages] brand-config merged. niche=${brand.niche} reference_style=${brand.reference_style || "fga-canonical"}`,
);

// ── Token budget ────────────────────────────────────────────────────
const BUDGETS = { tokens: 2000, reasoning: 3000, recipe: 1000 };
const approxTokens = (s) => Math.ceil((s || "").length / 4);

function trimToBudget(text, budget, label) {
  const t = approxTokens(text);
  if (t <= budget) return text;
  const cut = Math.floor(text.length * (budget / t) * 0.95);
  return text.slice(0, cut) + `\n\n[TRIMMED to fit ${label} budget — ${budget} tokens]`;
}

// ── Skill substrate ─────────────────────────────────────────────────
function resolveNicheFromVertical(vertical, taxonomy) {
  if (!vertical) return null;
  const v = vertical.toLowerCase();
  for (const n of taxonomy.niches) {
    if (n.matches.some((m) => v.includes(m))) return n.slug;
  }
  return null;
}

function summarizeTokens(t) {
  const lines = [`Name: ${t.name || t.id}`];
  if (t.description) lines.push(`Character: ${t.description}`);
  if (t.tokens?.colors) {
    lines.push("\nColors:");
    for (const [k, v] of Object.entries(t.tokens.colors)) {
      const value = typeof v === "string" ? v : v.value;
      const role = typeof v === "object" ? v.role : "";
      lines.push(`- ${k} = ${value} — ${role}`);
    }
  }
  if (t.tokens?.typography) {
    lines.push("\nTypography:");
    for (const [k, v] of Object.entries(t.tokens.typography)) {
      const value = typeof v === "string" ? v : v.value;
      const role = typeof v === "object" ? v.role : "";
      lines.push(`- ${k} = ${value} — ${role}`);
    }
  }
  if (Array.isArray(t.antiPatterns) && t.antiPatterns.length) {
    lines.push("\nToken anti-patterns:");
    for (const a of t.antiPatterns) lines.push(`- ${a}`);
  }
  return lines.join("\n");
}

function summarizeRecipes(r) {
  const lines = ["Per-section recipe (which library wins):"];
  for (const [section, spec] of Object.entries(r.sections || {})) {
    const fb = spec.fallback ? ` (fallback ${spec.fallback})` : "";
    lines.push(`- ${section}: ${spec.default}${fb}`);
  }
  if (r.conflictResolution?.tiebreaker) {
    lines.push(`\nTiebreaker: ${r.conflictResolution.tiebreaker}`);
  }
  return lines.join("\n");
}

function loadSkillSubstrate() {
  if (!existsSync(SKILL_DIR)) {
    console.warn(`[generate-pages] FGA_PRO_MAX_SKILL_DIR not found (${SKILL_DIR}) — no skill block`);
    return null;
  }
  const taxonomy = JSON.parse(readFileSync(join(SKILL_DIR, "reasoning/_taxonomy.json"), "utf-8"));
  const niche = brand.niche || resolveNicheFromVertical(site.vertical, taxonomy);
  const niceFile = niche
    ? readFileSync(join(SKILL_DIR, `reasoning/${niche}.md`), "utf-8")
    : "";
  const antipatterns = readFileSync(join(SKILL_DIR, "reasoning/_antipatterns.md"), "utf-8");
  const reasoning = trimToBudget(
    `### Niche reasoning: ${niche || "(none)"}\n\n${niceFile}\n\n### Universal anti-patterns\n\n${antipatterns}`,
    BUDGETS.reasoning,
    "reasoning",
  );

  let tokenSource = "fga-canonical";
  let tokenPath = join(SKILL_DIR, "tokens/fga-canonical.json");
  if (brand.reference_style && brand.reference_style !== "fga-canonical" && brand.reference_style !== "extractor-pending") {
    const p = join(SKILL_DIR, `tokens/seeds/${brand.reference_style}.json`);
    if (existsSync(p)) {
      tokenSource = brand.reference_style;
      tokenPath = p;
    }
  }
  const tokenJson = JSON.parse(readFileSync(tokenPath, "utf-8"));
  const tokensBlock = trimToBudget(
    `### Design tokens: ${tokenSource}\n\n${summarizeTokens(tokenJson)}`,
    BUDGETS.tokens,
    "tokens",
  );

  const recipes = JSON.parse(readFileSync(join(SKILL_DIR, "recipes/sections.json"), "utf-8"));
  const recipeBlock = trimToBudget(summarizeRecipes(recipes), BUDGETS.recipe, "recipe");

  const localBusinessSubtype =
    taxonomy.niches.find((n) => n.slug === niche)?.localBusinessSubtype || "LocalBusiness";

  return { niche, tokenSource, reasoning, tokensBlock, recipeBlock, localBusinessSubtype };
}

const AEO_CONTRACT = `### AEO baseline (every page must inherit)
- Required helpers: src/lib/seo.ts (siteGraph, faqGraph, pageMeta), src/components/json-ld.tsx
- JSON-LD: Organization + LocalBusiness (subtype: {LOCAL_BUSINESS_SUBTYPE}) + WebSite, all cross-referenced by @id
- FAQPage on home with 6-8 conversational Q&A pairs from brand.faqs[]
- Use declarative "is/are/serves" sentences in intros (AI engines lift these)
- Conversational H2/H3 in question form when natural
`;

const A2P_CONTRACT = `### A2P enforcement (BUILD-BLOCKING — enforce-a2p.mjs greps each file and FAILS the build)
- ANY phone-collecting input — type="tel", inputMode="tel", autoComplete="tel", or a name/id containing phone/tel/mobile/cell — REQUIRES, IN THE SAME FILE:
    1. the exact import:  import { SmsConsent } from "@/components/sms-consent";
    2. rendered EXACTLY as <SmsConsent /> with NO props (it reads legal_entity/dba/sample_messages from brand-config.json itself — passing any prop is a TypeScript build error), inside that same <form>, directly above the submit button.
  This is non-negotiable: a phone input without same-file SmsConsent fails the build. If you render a booking form with a phone field, you MUST add both lines.
- NEVER render <ChatWidget /> in a file that also has a phone input (A2P prohibits chat on phone-collecting pages). ChatWidget belongs on /about, /terms, /privacy only.
- Every phone-collecting form MUST POST to /api/book (audit-trail route).
- The SmsConsent opt-in checkbox is UNCHECKED by default (a pre-checked box is a carrier rejection trigger).
- Privacy Policy MUST carry the "no mobile info shared for marketing" carve-out.
- SMS Terms MUST mirror the verbatim sample_messages from brand.a2p.sample_messages[].
`;

const LIB_CONTRACT = `### Template APIs — use these EXACT imports + signatures. DO NOT invent props, argument shapes, or helpers.
- import brand from "@/lib/brand"  — ALWAYS import the brand kit via this exact path (depth-independent). NEVER use a relative "../../brand-config.json" path — it breaks on nested pages (about/, book/). ALL client data comes from here: brand.company, brand.tagline, brand.subtitle, brand.description, brand.canonical_url, brand.colors.{primary,primary_dark,primary_soft,accent,accent_dark,surface,surface_soft,ink,ink_soft,mute,line,line_soft}, brand.contact.{phone,email,address_locality,address_region}, brand.service_areas[], brand.faqs[] ({q,a}), brand.socials.{instagram,facebook,tiktok,youtube,linkedin}
- import { pageMeta, siteGraph, faqGraph, serviceGraph, canonical } from "@/lib/seo"
    pageMeta(path: string, title: string, description: string)   ← THREE positional string args, returns Metadata. Not an object arg.
    siteGraph()   serviceGraph()   — no args
    faqGraph(entries: {q:string; a:string}[])
    canonical(path: string): string
    export const metadata: Metadata = pageMeta("/", \`\${brand.company} — \${brand.tagline}\`, brand.description);
- PAGES ARE SERVER COMPONENTS (they export metadata). DO NOT use ANY React event handlers — no onClick, onMouseEnter, onMouseLeave, onChange, onSubmit, etc. (they cause a build-blocking "Event handlers cannot be passed to Client Component props" prerender error). For interactivity use ONLY: plain <a href="#id"> anchors, native <form action=...> submission, CSS :hover/:focus (add classes; do not inline JS), and <details>/<summary> for accordions. Hover color changes go in className, never style={{}} + onMouseEnter.
- Components (all NAMED exports). Prop-less unless noted — render exactly as shown:
    import { SiteHeader } from "@/components/site-header"      <SiteHeader />
    import { SiteFooter } from "@/components/site-footer"      <SiteFooter />
    import { ChatWidget } from "@/components/chat-widget"      <ChatWidget />   (NEVER on a page with a phone input)
    import { SmsConsent } from "@/components/sms-consent"      <SmsConsent />   (NO props)
    import { JsonLd } from "@/components/json-ld"              <JsonLd data={siteGraph()} />
- DO NOT use <HeroVideo /> — it has REQUIRED props (desktopSrc, mobileSrc, poster) and these sites have NO video assets. Build the hero as a full-bleed <section> with a brand-color background or gradient (brand.colors.primary → brand.colors.primary_dark, accented with brand.colors.accent) + a large headline (brand.tagline) overlay + a CTA button linking to /book. No video element.
- Components with required props (BrandMark, Socials, Reveal) — only use them if you supply the correct props; when unsure, write plain JSX instead. SiteHeader/SiteFooter/ChatWidget/SmsConsent/JsonLd are the safe prop-light ones (per signatures above).
- Use ONLY components that exist in src/components/. Do not import anything else. When unsure of a signature, write plain JSX instead of guessing.
`;

// ── Hub callbacks ──────────────────────────────────────────────────
async function patchHub(updates) {
  if (!HUB_RPC_SECRET || !site.slug) return;
  try {
    const r = await fetch(`${HUB_BASE}/api/employee-hub/marketing-site/${site.slug}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${HUB_RPC_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!r.ok) console.warn(`[generate-pages] hub PATCH failed: ${r.status} ${await r.text()}`);
  } catch (e) {
    console.warn(`[generate-pages] hub PATCH error: ${e.message}`);
  }
}

// ── Anthropic SDK ──────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const sdkMod = await import("@anthropic-ai/sdk").catch((err) => {
    console.error(`[generate-pages] @anthropic-ai/sdk not installed. Run: npm i @anthropic-ai/sdk`);
    throw err;
  });
  const Anthropic = sdkMod.default || sdkMod.Anthropic;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // Stream the response: at high max_tokens the SDK requires streaming (a
  // non-streaming request that could exceed 10 min is rejected). Streaming also
  // removes that ceiling. max_tokens 28000 gives ample headroom for verbose
  // pages; the truncation guard below still catches any overrun.
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 28000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "max_tokens") {
    throw new Error(
      "Claude response hit max_tokens (truncated mid-output) — raise max_tokens or split the page. Refusing to write truncated TSX.",
    );
  }
  return msg.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
}

function extractTsxFromResponse(text) {
  const fence = /```(?:tsx|typescript|jsx)?\s*\n([\s\S]*?)\n```/m;
  const m = text.match(fence);
  return m ? m[1] : text.trim();
}

// ── Per-page execution ────────────────────────────────────────────
const PAGES = [
  { name: "home", route: "/", out: "src/app/page.tsx", always: true },
  { name: "about", route: "/about", out: "src/app/about/page.tsx", always: true },
  { name: "terms", route: "/terms", out: "src/app/terms/page.tsx", always: true },
  { name: "privacy", route: "/privacy", out: "src/app/privacy/page.tsx", always: true },
  {
    name: "book",
    route: "/book",
    out: "src/app/book/page.tsx",
    always: false,
    when: (b) => b.has_booking !== false,
  },
];

function interpolate(text, b, niche) {
  return text
    .replace(/\{\{business_name\}\}/g, b.business_name || "the business")
    .replace(/\{\{niche\}\}/g, niche || "agency-b2b")
    .replace(/\{\{legal_entity\}\}/g, b.legal_entity || b.business_name || "")
    .replace(/\{\{dba\}\}/g, b.dba || b.business_name || "");
}

async function generateOnePage(page, substrate) {
  const contractPath = join(ROOT, "prompts", `${page.name}.md`);
  if (!existsSync(contractPath)) {
    console.warn(`[generate-pages] no contract for ${page.name} — skipping`);
    return { page: page.name, skipped: true };
  }
  const contract = interpolate(readFileSync(contractPath, "utf-8"), brand, substrate?.niche);
  const skillBlock = substrate
    ? `<fga-pro-max-skill v="0.3.0">\n\n${substrate.reasoning}\n\n${substrate.tokensBlock}\n\n${substrate.recipeBlock}\n\n${AEO_CONTRACT.replace("{LOCAL_BUSINESS_SUBTYPE}", substrate.localBusinessSubtype)}\n\n${A2P_CONTRACT}\n\n${LIB_CONTRACT}\n\n</fga-pro-max-skill>`
    : `${AEO_CONTRACT.replace("{LOCAL_BUSINESS_SUBTYPE}", "LocalBusiness")}\n\n${A2P_CONTRACT}\n\n${LIB_CONTRACT}`;

  const systemPrompt = `You are the FGA Pro Max site-generation skill writing a single page for a marketing site.\n\n${skillBlock}\n\n${contract}`;
  const userPrompt = `brand-config.json:\n\`\`\`json\n${JSON.stringify(brand, null, 2)}\n\`\`\`\n\nGENERATE THE PAGE NOW. Single fenced \`\`\`tsx code block. No prose outside the fence.`;

  console.log(`[generate-pages] generating ${page.name} (${page.route})…`);
  await patchHub({ status: "generating", detail: `Generating ${page.name}`, history_kind: "generating", history_detail: `page: ${page.name}` });

  const text = await callClaude(systemPrompt, userPrompt);
  const tsx = extractTsxFromResponse(text);
  if (!tsx || tsx.length < 100) throw new Error(`Generated TSX for ${page.name} too short (${tsx.length} chars)`);

  const outPath = join(ROOT, page.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, tsx);
  console.log(`[generate-pages] wrote ${page.out} (${tsx.length} chars)`);
  return { page: page.name, bytes: tsx.length };
}

async function main() {
  console.log(`[generate-pages] starting for slug=${site.slug}`);
  await patchHub({ status: "generating", detail: "Composing skill substrate" });

  const substrate = loadSkillSubstrate();
  if (substrate) {
    console.log(`[generate-pages] skill substrate composed. niche=${substrate.niche} reference_style=${substrate.tokenSource}`);
  }

  const results = [];
  for (const page of PAGES) {
    if (!page.always && page.when && !page.when(brand)) {
      console.log(`[generate-pages] skipping ${page.name} (condition false)`);
      continue;
    }
    try {
      results.push(await generateOnePage(page, substrate));
    } catch (e) {
      console.error(`[generate-pages] ${page.name} FAILED: ${e.message}`);
      await patchHub({ status: "failed", error: `Page ${page.name}: ${e.message}` });
      process.exit(1);
    }
  }

  console.log(`[generate-pages] complete. ${results.length} pages generated.`);
  await patchHub({ status: "deploying", detail: `${results.length} pages generated, smoke build next` });
}

await main();
