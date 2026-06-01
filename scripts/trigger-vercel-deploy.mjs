#!/usr/bin/env node
/**
 * trigger-vercel-deploy.mjs — Phase 6 wires this. Currently a no-op stub.
 *
 * Planned behavior (Phase 6):
 *   - Read site.json
 *   - Resolve Vercel project name via resolveVercelProjectName(slug)
 *   - POST to https://api.vercel.com/v13/deployments to trigger a deploy
 *     (using VERCEL_TOKEN + VERCEL_TEAM_ID env)
 *   - Wait for readyState=READY (poll every 5s, timeout 5min)
 *   - Print the live_url + write it to deploy.json for the workflow's
 *     subsequent hub-callback step
 *
 * Until Phase 6 ships, the Vercel project's git integration handles
 * deployment automatically — the commit pushed by the workflow triggers
 * a deploy via the github→vercel webhook with no explicit API call.
 *
 * Note: per reference_client_site_deploys, fga-marketing-site-* consumer
 * repos do NOT auto-deploy on push (Vercel git integration must be
 * manually wired in Phase 6). This stub is a placeholder for that wiring.
 */
console.log("[trigger-vercel-deploy] Phase 6 wires this — pending");
console.log("[trigger-vercel-deploy] for now, manually run `vercel deploy --prod` on the consumer repo");
process.exit(0);
