import brand from "../../brand-config.json";

/**
 * GHL / LeadConnector chat widget.
 *
 * Loader is GHL's standard beta.leadconnectorhq.com/loader.js — the only
 * client-specific bit is the data-widget-id (resolved per client at
 * sub-account → Settings → Chat Widget). The Generate-Site pipeline pulls
 * the widget id from the brand kit and writes it into brand-config.json
 * (`brand.ghl.chat_widget_id`).
 *
 * React 19 / Next.js 16 pattern: rendering a <script async> element in any
 * Server Component places it in the static HTML so carrier compliance
 * auditors can see it via view-source. The older next/script
 * `afterInteractive` strategy injects via JS at hydration time which is
 * invisible to a raw HTML fetch even though the widget loads correctly at
 * runtime.
 *
 * A2P COMPLIANCE NOTE: this component must NOT be rendered on pages that
 * also collect phone numbers (the homepage booking form + /thanks).
 * Business Website Compliance Checklist rule:
 *   "I confirm that no forms collecting phone numbers or SMS opt-in
 *   consent exist on any page where the chat widget is embedded."
 *
 * Default safe placements: /about, /terms, /privacy.
 * Default excluded: / (booking form), /thanks (post-booking).
 *
 * If brand.ghl.chat_widget_id is empty the component renders nothing —
 * useful for clients without a configured GHL widget.
 */
export function ChatWidget() {
  const widgetId = brand.ghl?.chat_widget_id;
  if (!widgetId) return null;
  return (
    <script
      async
      src="https://beta.leadconnectorhq.com/loader.js"
      data-resources-url="https://beta.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id={widgetId}
    />
  );
}
