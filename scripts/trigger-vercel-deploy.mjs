#!/usr/bin/env node
/**
 * trigger-vercel-deploy.mjs — Phase 6 real implementation.
 *
 * Deploys the freshly-generated marketing site to Vercel (production) using the
 * Vercel CLI via npx, mirroring the proven proposal pipeline
 * (fga-client-template/generate.yml). Sequence:
 *   1. read the FLAT site.json (yml already unwrapped the hub's {site} envelope)
 *   2. `vercel projects add <project>`            (idempotent — || ignore)
 *   3. `vercel link --yes --project <project>`    (writes .vercel/project.json)
 *   4. PATCH project: framework=nextjs + ssoProtection=null + passwordProtection=null
 *      (API-created projects don't auto-detect the framework and default to SSO-gated)
 *   5. `vercel deploy --prod`                      (Vercel builds Next.js server-side)
 *   6. `vercel alias set <deployUrl> <project>.vercel.app`  (canonical alias)
 *   7. if custom_domain present, alias that too
 *   8. write live_url to $GITHUB_OUTPUT (+ deploy.json) for the workflow callback
 *
 * Env: VERCEL_TOKEN (required), VERCEL_ORG_ID (team slug, used as --scope + ?teamId).
 * Degrades gracefully (warn + exit 0, no live_url) when VERCEL_TOKEN is absent so
 * local/structural runs don't hard-fail; the hub callback then reports no live_url
 * and the operator-action checklist covers provisioning the secret.
 *
 * Project name convention: <slug>-marketing (matches MarketingSite.vercel_project).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const sitePath = process.argv[2] || "site.json";
if (!existsSync(sitePath)) {
  console.error(`[trigger-vercel-deploy] site file not found: ${sitePath}`);
  process.exit(2);
}
const site = JSON.parse(readFileSync(sitePath, "utf-8"));
const slug = site.slug;
if (!slug) {
  console.error("[trigger-vercel-deploy] site.json has no slug");
  process.exit(2);
}
const project = site.vercel_project || `${slug}-marketing`;
const customDomain = site.custom_domain || "";

const TOKEN = process.env.VERCEL_TOKEN || "";
const ORG = process.env.VERCEL_ORG_ID || "";
const ghOut = process.env.GITHUB_OUTPUT || "";

function setOutput(key, value) {
  console.log(`[trigger-vercel-deploy] ${key}=${value}`);
  if (ghOut) appendFileSync(ghOut, `${key}=${value}\n`);
}

if (!TOKEN) {
  console.warn(
    "[trigger-vercel-deploy] VERCEL_TOKEN not set — skipping deploy (graceful). " +
      "Set VERCEL_TOKEN + VERCEL_ORG_ID secrets on the template to enable.",
  );
  setOutput("live_url", "");
  process.exit(0);
}

const scope = ORG ? ` --scope=${ORG}` : "";
// Token is passed via the VERCEL_TOKEN env var (Vercel CLI reads it), NEVER as a
// --token= flag — so it can never appear in a command string / error message.
const baseEnv = { ...process.env, VERCEL_TOKEN: TOKEN };
const redact = (s) => String(s == null ? "" : s).split(TOKEN).join("***");
const vercel = (args, opts = {}) =>
  execSync(`npx --yes vercel@latest ${args}${scope}`, {
    stdio: opts.capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf-8",
    env: { ...baseEnv, ...(opts.env || {}) },
  });

try {
  console.log(`[trigger-vercel-deploy] project=${project} org=${ORG || "(personal)"}`);

  // 1. idempotent project create
  try {
    vercel(`projects add ${project}`);
  } catch {
    console.log("[trigger-vercel-deploy] project add non-fatal (likely exists)");
  }

  // 2. link → writes .vercel/project.json
  vercel(`link --yes --project=${project}`);
  const linkInfo = JSON.parse(readFileSync(".vercel/project.json", "utf-8"));
  const projectId = linkInfo.projectId;
  const orgId = linkInfo.orgId; // REAL team id (team_…) — not the slug; the CLI requires the id form
  console.log(`[trigger-vercel-deploy] linked projectId=${projectId}`);

  // 3. set framework + disable SSO/password protection so the live URL is public
  const teamQ = ORG ? `?teamId=${ORG}` : "";
  // Token passed via $VTK env (shell-expanded by execSync's /bin/sh) so it never
  // appears literally in the command string.
  execSync(
    `curl -fsS -X PATCH ` +
      `-H "Authorization: Bearer $VTK" -H "Content-Type: application/json" ` +
      `-d '{"framework":"nextjs","ssoProtection":null,"passwordProtection":null}' ` +
      `"https://api.vercel.com/v9/projects/${projectId}${teamQ}"`,
    { stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, VTK: TOKEN } },
  );

  // 4. deploy from source (no --prebuilt; Vercel builds Next.js server-side).
  // VERCEL_ORG_ID in env REQUIRES VERCEL_PROJECT_ID too — set it from the link.
  const out = vercel(`deploy --prod --yes`, {
    capture: true,
    env: { VERCEL_PROJECT_ID: projectId, VERCEL_ORG_ID: orgId },
  });
  const m = out.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/i);
  if (!m) {
    console.error("[trigger-vercel-deploy] could not parse deploy URL");
    console.error(out);
    process.exit(1);
  }
  const deployUrl = m[0];
  console.log(`[trigger-vercel-deploy] deployed (immutable): ${deployUrl}`);

  // 5. canonical alias
  const canonical = `https://${project}.vercel.app`;
  try {
    vercel(`alias set ${deployUrl} ${project}.vercel.app`);
  } catch {
    console.log("[trigger-vercel-deploy] canonical alias non-fatal");
  }

  // 6. custom domain alias (optional)
  let liveUrl = canonical;
  if (customDomain) {
    try {
      vercel(`alias set ${deployUrl} ${customDomain}`);
      liveUrl = `https://${customDomain.replace(/^https?:\/\//, "")}`;
      console.log(`[trigger-vercel-deploy] custom domain aliased: ${liveUrl}`);
    } catch {
      console.log("[trigger-vercel-deploy] custom-domain alias failed; using canonical");
    }
  }

  writeFileSync("deploy.json", JSON.stringify({ live_url: liveUrl, deploy_url: deployUrl, project }, null, 2));
  setOutput("live_url", liveUrl);
  console.log(`[trigger-vercel-deploy] live_url=${liveUrl}`);
} catch (err) {
  console.error("[trigger-vercel-deploy] deploy failed:", redact(err && err.message ? err.message : err));
  process.exit(1);
}
