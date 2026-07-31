#!/usr/bin/env node
/**
 * generate-pages.mjs — Phase 5e Agent SDK driver for FGA Pro Max (SOTY model).
 *
 * ARCHITECTURE (per SOTY-SUBSTRATE-PLAN.md Phase 4 + AGENTS.md):
 *   The marketing-site layout is a FIXED, hand-crafted SOTY composition
 *   (src/app/page.tsx server shell + src/components/showcase/SotyHome.tsx). The
 *   pipeline does NOT generate page TSX from scratch — it FILLS that composition
 *   with the brand's niche-tuned CONTENT by overwriting brand-config.json only.
 *
 *   This driver therefore:
 *     1. Merges the hub site.json brand into brand-config.json.
 *     2. Loads the fga-pro-max skill substrate (niche reasoning) for grammar.
 *     3. Runs ONE Claude call against prompts/home.md to produce a strict JSON
 *        content object (tagline, subtitle, description, faqs, content{...}).
 *     4. Validates + sanitizes every field; an invalid field falls back to the
 *        existing brand-config value, so generation never ships worse than the
 *        template default. Then writes brand-config.json.
 *     5. NEVER touches src/app/**.tsx. /terms + /privacy carry carrier-locked
 *        SMS prose (AGENTS.md: DO NOT REGENERATE); the home is the fixed SOTY
 *        substrate; both are preserved by construction.
 *
 *   Testimonials are NOT fabricated — they are taken from the hub site record
 *   (site.testimonials / brand.content.testimonials) when present, else left
 *   empty so the section simply does not render.
 *
 * Usage:    node scripts/generate-pages.mjs <site.json-path>
 *
 * Env:
 *   ANTHROPIC_API_KEY      — required (Sonnet)
 *   HUB_BASE               — hub origin for status PATCHes (default prod)
 *   HUB_RPC_SECRET         — bearer for hub PATCH callbacks
 *   FGA_PRO_MAX_SKILL_DIR  — optional; niche reasoning if present
 *   GENERATE_FIXTURE       — optional; path to a canned Claude JSON response
 *                            (skips the API call — local tests / CI smoke)
 *
 * Exit codes: 0 ok · 1 generation/validation failure · 2 bad args · 3 missing env
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTokens } from "./lib/resolve-tokens.mjs";
import { auditPalette, enforcePaletteContrast } from "./lib/contrast.mjs";
import { extractInspiration } from "./extract-inspiration.mjs";
import { inspirationToLayoutVars } from "./lib/inspiration.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const sitePath = process.argv[2];
if (!sitePath) {
  console.error("Usage: node scripts/generate-pages.mjs <site.json-path>");
  process.exit(2);
}
const FIXTURE = process.env.GENERATE_FIXTURE || "";
if (!process.env.ANTHROPIC_API_KEY && !FIXTURE) {
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

// ── Reference-style token resolution (design engine Increment 2) ─────────────
// Resolve the chosen reference-style SEED (an fga-pro-max-skill token set) into
// the fixed brand-config color + font slots, so two styles render a visibly
// different color + type treatment on the same content. This runs BEFORE the
// brand-kit merge below, so the client's own primary/accent/fonts always win;
// the seed supplies the style character and fills every slot the kit leaves
// blank. Only fires when the operator explicitly chose a style — an unstyled
// site keeps the template's neutral defaults.
function loadSeed(style) {
  if (!style) return null;
  const file = style === "fga-canonical"
    ? join(SKILL_DIR, "tokens", "fga-canonical.json")
    : join(SKILL_DIR, "tokens", "seeds", `${style}.json`);
  if (!existsSync(file)) {
    console.warn(`[generate-pages] reference_style seed not found: ${file} — skipping token resolution`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch (e) {
    console.warn(`[generate-pages] seed parse failed for ${style}: ${e.message} — skipping`);
    return null;
  }
}
if (site.reference_style) {
  const seed = loadSeed(site.reference_style);
  const resolved = seed ? resolveTokens(seed) : null;
  if (resolved) {
    brand.colors = { ...brand.colors, ...resolved.colors };
    brand.fonts = { ...brand.fonts, ...resolved.fonts };
    if (resolved.radius) brand.radius = resolved.radius;
    console.log(
      `[generate-pages] reference_style "${site.reference_style}" resolved. ` +
      `surface=${resolved.colors.surface} ink=${resolved.colors.ink} accent=${resolved.colors.accent} ` +
      `display=${resolved.fonts.display || "(seed default)"} radius=${resolved.radius || "(default)"}`,
    );
  }
}

// ── Inspiration (design engine Increment 3 — URL analysis, LAYOUT/MOTION ONLY)
// When the operator supplies a reference_style_url, analyze its STRUCTURE only —
// section spacing rhythm + content measure + motion intensity — and store it on
// brand.layout. Per anti-mimicry (spec §7 I2) this NEVER contributes palette or
// type: the resolver only reads geometry/motion, and only --section-scale +
// --maxw ever reach the render. Fully fail-safe: any extraction failure leaves
// brand.layout unset and the build proceeds on seed + kit tokens alone.
if (site.reference_style_url) {
  try {
    const inspiration = await extractInspiration(site.reference_style_url);
    if (inspiration) {
      brand.layout = inspiration;
      const vars = inspirationToLayoutVars(inspiration);
      // Palette + type from the reference outrank the style SEED (the operator
      // pointed at this URL on purpose, so it should beat a generic seed), but
      // the brand-kit merge below still runs after this, so a client's own
      // brand colours keep winning. Contrast enforcement runs last regardless.
      if (inspiration.colors) brand.colors = { ...brand.colors, ...inspiration.colors };
      if (inspiration.fonts) brand.fonts = { ...brand.fonts, ...inspiration.fonts };
      console.log(
        `[generate-pages] inspiration from ${site.reference_style_url}: ` +
        `density=${inspiration.density} measure=${inspiration.measure} motion=${inspiration.motion} ` +
        `(vars ${JSON.stringify(vars)}) ` +
        `palette=${inspiration.colors ? JSON.stringify(inspiration.colors) : "(none found)"} ` +
        `type=${inspiration.fonts ? JSON.stringify(inspiration.fonts) : "(none found)"}`,
      );
    }
  } catch (e) {
    console.warn(`[generate-pages] inspiration skipped: ${e.message}`);
  }
}

// Merge the hub-supplied brand facts (colors, contact, company, niche, …) first.
// The hub sends only the facts it can source from the brand kit — for the nested
// objects (colors/fonts/contact) that is a PARTIAL (e.g. just primary + accent).
// A shallow Object.assign would replace the whole nested object and blow away
// the 8 template color tokens the kit doesn't carry (surface/ink/mute/line/…),
// breaking the render. Deep-merge those three so a partial overlays the template
// defaults; every other field is a plain scalar and assigns directly.
const NESTED_BRAND_KEYS = new Set(["colors", "fonts", "contact", "socials"]);

// When the operator EXPLICITLY chose a reference (a style seed or a URL), that
// choice owns the aesthetic and the brand kit must not erase it.
//
// This is why "design like Eleven Madison Park" had almost no visible effect on
// franchi-law: the EMP seed resolved cream/green/gold, then the kit overwrote
// `ink` and `accent` with the client's navy and only the cream surface survived.
// The operator asked for the result to read as a sibling of the reference, so
// the reference keeps the aesthetic slots (page, text, accent, type) and the kit
// keeps the client's IDENTITY slots (the primary brand colour used for the brand
// band and logo lockups). With no reference chosen the kit still wins outright.
const HAS_REFERENCE = Boolean(site.reference_style || site.reference_style_url);
const KIT_YIELDS_TO_REFERENCE = new Set([
  "surface", "surface_soft", "ink", "ink_soft", "mute", "accent", "accent_dark",
  "line", "line_soft",
]);

if (site.brand && typeof site.brand === "object") {
  for (const [key, value] of Object.entries(site.brand)) {
    if (
      NESTED_BRAND_KEYS.has(key) &&
      value && typeof value === "object" && !Array.isArray(value) &&
      brand[key] && typeof brand[key] === "object" && !Array.isArray(brand[key])
    ) {
      let incoming = value;
      if (HAS_REFERENCE && (key === "colors" || key === "fonts")) {
        incoming = Object.fromEntries(
          Object.entries(value).filter(([slot]) =>
            key === "fonts" ? false : !KIT_YIELDS_TO_REFERENCE.has(slot),
          ),
        );
        const dropped = Object.keys(value).filter((s) => !(s in incoming));
        if (dropped.length) {
          console.log(
            `[generate-pages] reference "${site.reference_style_url || site.reference_style}" owns the aesthetic; ` +
            `brand-kit ${key} deferred for: ${dropped.join(", ")}`,
          );
        }
      }
      brand[key] = { ...brand[key], ...incoming };
    } else {
      brand[key] = value;
    }
  }
}
if (site.niche) brand.niche = site.niche;
if (site.reference_style) brand.reference_style = site.reference_style;
if (site.reference_style_url) brand.reference_style_url = site.reference_style_url;

// ── canonical_url: the site's own address ────────────────────────────────────
//
// `brand.canonical_url` feeds seo.ts's canonical(), which feeds metadataBase,
// <link rel="canonical">, og:url, the JSON-LD graph, robots.txt's Host and
// Sitemap, and the address printed on /privacy and /terms.
//
// The template default is "https://example.com" and NOTHING was overwriting it:
// the hub's brand facts come from the harvest brand KIT, and a site's URL is not
// a brand-kit fact. So every generated site shipped
// `<link rel="canonical" href="https://example.com">` on every page. Measured
// live 2026-07-30 on dyre-athletics-marketing and franchi-law-marketing, both of
// which also served `Sitemap: https://example.com/sitemap.xml`. A canonical
// pointing at a domain we do not own tells Google the client's page is a
// duplicate of someone else's, which can suppress indexing outright.
//
// The URL IS knowable here: site.json is the flat hub record, which carries the
// attached custom domain, the live URL and the Vercel project. Precedence runs
// most-real first, so a lander re-generated after its domain is attached
// upgrades from the vercel.app URL to the client's own.
function resolveCanonicalUrl() {
  const clean = (u) => String(u).trim().replace(/\/+$/, "");
  const withScheme = (u) => (/^https?:\/\//i.test(u) ? clean(u) : `https://${clean(u)}`);
  if (site.custom_domain) return { url: withScheme(site.custom_domain), from: "custom_domain" };
  if (site.live_url) return { url: withScheme(site.live_url), from: "live_url" };
  if (site.vercel_project) {
    return { url: `https://${clean(site.vercel_project)}.vercel.app`, from: "vercel_project" };
  }
  if (site.vercel_preview_url) return { url: withScheme(site.vercel_preview_url), from: "vercel_preview_url" };
  return null;
}
const canonicalResolved = resolveCanonicalUrl();
if (canonicalResolved) {
  brand.canonical_url = canonicalResolved.url;
  console.log(
    `[generate-pages] canonical_url = ${brand.canonical_url} (from site.${canonicalResolved.from})`,
  );
} else {
  // Nothing to resolve from. Leaving the placeholder would ship the very defect
  // this block exists to stop, and the build gate below turns it into a loud
  // failure rather than a silent SEO regression on a client's site.
  console.error(
    "[generate-pages] could not resolve canonical_url: site.json has no custom_domain, " +
      "live_url, vercel_project or vercel_preview_url",
  );
}

// G1 + G3b: fold the funnel wiring from the hub record into brand-config.ghl, so
// the home page renders the operator's chosen form/calendar mode and the booking
// form routes to the right sub-account. The API TOKEN is never in site.ghl (it
// lives in the read-guarded token store, injected as a Vercel env at deploy);
// only the non-secret ids + modes travel here. Only overwrite when present so a
// site without CRM config keeps the template defaults (native form, no calendar).
if (site.ghl && typeof site.ghl === "object") {
  brand.ghl = brand.ghl || {};
  const g = site.ghl;
  if (g.location_id) brand.ghl.location_id = g.location_id;
  if (g.form_mode) brand.ghl.form_mode = g.form_mode;
  if (typeof g.form_id === "string") brand.ghl.form_id = g.form_id;
  if (g.calendar_mode) brand.ghl.calendar_mode = g.calendar_mode;
  if (typeof g.calendar_id === "string") brand.ghl.calendar_id = g.calendar_id;
  console.log(
    `[generate-pages] ghl funnel merged. form=${brand.ghl.form_mode || "native"} calendar=${brand.ghl.calendar_mode || "native"} location=${brand.ghl.location_id || "(none)"}`,
  );
}
// ── WCAG AA contrast enforcement (runs LAST, on the merged palette) ─────────
// Must come after every colour layer (template default < seed < brand kit),
// because the kit overrides ink / accent / primary and would undo any guarantee
// made earlier. Repairs text tokens along their own hue and derives on_accent /
// on_primary for colored backgrounds. See scripts/lib/contrast.mjs for the audit
// that motivated this (174/324 rendered pairs were below AA before it existed).
if (brand.colors && typeof brand.colors === "object") {
  const before = auditPalette(brand.colors, { legacy: true });
  brand.colors = enforcePaletteContrast(brand.colors);
  const after = auditPalette(brand.colors);
  if (before.length) {
    for (const f of before) {
      console.log(
        `[generate-pages] contrast repair: ${f.label} was ${f.fgValue} on ${f.bgValue} (${f.ratio.toFixed(2)}:1)`,
      );
    }
  }
  console.log(
    `[generate-pages] contrast enforced. ${before.length} pair(s) below AA before, ${after.length} after. ` +
    `ink=${brand.colors.ink} mute=${brand.colors.mute} on_accent=${brand.colors.on_accent} on_primary=${brand.colors.on_primary}`,
  );
  if (after.length) {
    for (const f of after) {
      console.warn(
        `[generate-pages] WARNING unresolved contrast: ${f.label} ${f.fgValue} on ${f.bgValue} = ${f.ratio.toFixed(2)}:1`,
      );
    }
  }
}

writeFileSync(brandConfigPath, JSON.stringify(brand, null, 2));
console.log(
  `[generate-pages] brand merged. company=${brand.company} niche=${brand.niche} reference_style=${brand.reference_style || "fga-canonical"}`,
);

// ── Skill substrate (niche grammar) ─────────────────────────────────
const BUDGET_REASONING = 3000;
const approxTokens = (s) => Math.ceil((s || "").length / 4);
function trimToBudget(text, budget, label) {
  const t = approxTokens(text);
  if (t <= budget) return text;
  const cut = Math.floor(text.length * (budget / t) * 0.95);
  return text.slice(0, cut) + `\n\n[TRIMMED to fit ${label} budget — ${budget} tokens]`;
}
function resolveNicheFromVertical(vertical, taxonomy) {
  if (!vertical) return null;
  const v = vertical.toLowerCase();
  for (const n of taxonomy.niches) if (n.matches.some((m) => v.includes(m))) return n.slug;
  return null;
}
function loadNicheReasoning() {
  if (!existsSync(SKILL_DIR)) {
    console.warn(`[generate-pages] FGA_PRO_MAX_SKILL_DIR not found (${SKILL_DIR}) — generic grammar`);
    return { niche: brand.niche || null, reasoning: "" };
  }
  try {
    const taxonomy = JSON.parse(readFileSync(join(SKILL_DIR, "reasoning/_taxonomy.json"), "utf-8"));
    const niche = brand.niche || resolveNicheFromVertical(site.vertical, taxonomy);
    const nicheFile = niche && existsSync(join(SKILL_DIR, `reasoning/${niche}.md`))
      ? readFileSync(join(SKILL_DIR, `reasoning/${niche}.md`), "utf-8")
      : "";
    const reasoning = nicheFile
      ? trimToBudget(`### Niche grammar: ${niche}\n\n${nicheFile}`, BUDGET_REASONING, "reasoning")
      : "";
    return { niche, reasoning };
  } catch (e) {
    console.warn(`[generate-pages] skill substrate load failed: ${e.message} — generic grammar`);
    return { niche: brand.niche || null, reasoning: "" };
  }
}

// ── Hub callbacks ───────────────────────────────────────────────────
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

// ── Anthropic SDK ───────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  if (FIXTURE) {
    console.log(`[generate-pages] using fixture response: ${FIXTURE}`);
    return readFileSync(FIXTURE, "utf-8");
  }
  const sdkMod = await import("@anthropic-ai/sdk").catch((err) => {
    console.error("[generate-pages] @anthropic-ai/sdk not installed. Run: npm i @anthropic-ai/sdk");
    throw err;
  });
  const Anthropic = sdkMod.default || sdkMod.Anthropic;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "max_tokens") {
    throw new Error("Claude response hit max_tokens (truncated) — refusing to parse partial JSON.");
  }
  return msg.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
}

function extractJson(text) {
  // Prefer a fenced ```json block; else the first balanced {...}.
  const fence = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/m);
  const raw = fence ? fence[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

// ── Validation / sanitization ───────────────────────────────────────
// Every field that fails validation falls back to the existing brand-config
// value, so a partial/garbled LLM response degrades to the template default
// instead of breaking the SOTY render.
// Normalize generated copy: enforce the no-em-dash brand rule deterministically
// (the model drifts even when the prompt forbids them), and tidy any artifacts
// the substitution leaves behind. A space-bounded en/em dash or "--" becomes a
// comma; numeric ranges like "9-5" are left alone.
function normalizeCopy(s) {
  return s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+--\s+/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
const str = (v) => {
  if (typeof v !== "string") return null;
  const s = normalizeCopy(v.trim());
  return s ? s : null;
};

function sanitize(gen) {
  const prevContent = brand.content ?? {};
  const out = {};

  out.tagline = str(gen.tagline) ?? brand.tagline;
  out.subtitle = str(gen.subtitle) ?? brand.subtitle;
  out.description = str(gen.description) ?? brand.description;

  // FAQs — 4..8 entries of {q,a}; else keep existing.
  const faqs = Array.isArray(gen.faqs)
    ? gen.faqs.map((f) => ({ q: str(f?.q), a: str(f?.a) })).filter((f) => f.q && f.a).slice(0, 8)
    : [];
  out.faqs = faqs.length >= 4 ? faqs : brand.faqs;

  const gc = gen.content ?? {};
  const content = {};

  const marquee = (Array.isArray(gc.marquee) ? gc.marquee.map(str).filter(Boolean) : []).slice(0, 6);
  content.marquee = marquee.length >= 4 ? marquee : prevContent.marquee;

  const ps = gc.pinned_statement;
  const psText = str(ps?.text);
  if (psText) {
    const aw = str(ps.accent_word);
    content.pinned_statement = {
      text: psText,
      // accent_word must literally appear in the (normalized) statement (PinnedStatement highlights it).
      accent_word: aw && psText.toLowerCase().includes(aw.toLowerCase()) ? aw : undefined,
    };
  } else {
    content.pinned_statement = prevContent.pinned_statement;
  }

  const vp = Array.isArray(gc.value_props)
    ? gc.value_props.map((v) => ({ title: str(v?.title), description: str(v?.description) }))
        .filter((v) => v.title && v.description).slice(0, 4)
    : [];
  content.value_props = vp.length >= 3 ? vp : prevContent.value_props;

  const steps = Array.isArray(gc.process_steps)
    ? gc.process_steps.map((s, i) => ({
        step: str(s?.step) ?? String(i + 1).padStart(2, "0"),
        title: str(s?.title),
        description: str(s?.description),
      })).filter((s) => s.title && s.description).slice(0, 3)
    : [];
  content.process_steps = steps.length === 3 ? steps : prevContent.process_steps;

  const cta = gc.cta;
  if (cta && str(cta.title)) {
    content.cta = {
      kicker: str(cta.kicker) ?? "",
      title: cta.title.trim(),
      subtitle: str(cta.subtitle) ?? "",
      button: str(cta.button) ?? "Get started",
    };
  } else {
    content.cta = prevContent.cta;
  }

  // Testimonials are NEVER fabricated. Take real ones from the hub record only,
  // and drop any leftover "Replace with…" template placeholders.
  const provided = site.testimonials || site.brand?.content?.testimonials || prevContent.testimonials;
  const tlist = Array.isArray(provided)
    ? provided.map((t) => ({ quote: str(t?.quote), author: str(t?.author), location: str(t?.location) || undefined }))
        .filter((t) => t.quote && t.author && !/replace/i.test(t.author))
    : [];
  content.testimonials = tlist;

  out.content = content;
  return out;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`[generate-pages] starting for slug=${site.slug}`);
  await patchHub({ status: "generating", detail: "Composing niche-tuned content" });

  const contractPath = join(ROOT, "prompts", "home.md");
  if (!existsSync(contractPath)) {
    console.error("[generate-pages] missing prompts/home.md content contract");
    await patchHub({ status: "failed", error: "missing prompts/home.md" });
    process.exit(1);
  }
  const contract = readFileSync(contractPath, "utf-8");
  const { niche, reasoning } = loadNicheReasoning();

  const systemPrompt =
    `You are the FGA Pro Max content writer. The marketing site layout is FIXED — ` +
    `you are NOT writing code, you are writing the niche-tuned COPY that fills it.\n\n` +
    (reasoning ? `${reasoning}\n\n` : "") +
    contract;

  const facts = {
    company: brand.company,
    niche: niche || brand.niche,
    legal_entity: brand.legal_entity,
    description: brand.description,
    service_areas: brand.service_areas,
    contact: brand.contact,
    hub_notes: site.notes || site.brief || site.description || "",
  };
  const userPrompt =
    `Business facts (the ONLY source of truth — never invent prices, addresses, hours, stats, or reviews):\n` +
    `\`\`\`json\n${JSON.stringify(facts, null, 2)}\n\`\`\`\n\n` +
    `Return ONE JSON object exactly matching the schema in the contract. No prose outside the JSON.`;

  console.log(`[generate-pages] generating content (niche=${niche || "generic"})…`);
  const text = await callClaude(systemPrompt, userPrompt);

  let gen;
  try {
    gen = extractJson(text);
  } catch (e) {
    console.error(`[generate-pages] could not parse JSON from Claude: ${e.message}`);
    await patchHub({ status: "failed", error: `content JSON parse: ${e.message}` });
    process.exit(1);
  }

  const sanitized = sanitize(gen);
  Object.assign(brand, sanitized);
  writeFileSync(brandConfigPath, JSON.stringify(brand, null, 2));

  console.log(
    `[generate-pages] content written. tagline="${brand.tagline}" ` +
    `faqs=${brand.faqs?.length ?? 0} value_props=${brand.content?.value_props?.length ?? 0} ` +
    `steps=${brand.content?.process_steps?.length ?? 0} testimonials=${brand.content?.testimonials?.length ?? 0}`,
  );
  await patchHub({ status: "deploying", detail: "Content generated, smoke build next" });
}

await main();
