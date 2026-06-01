# Per-page contract: TERMS (/terms)

You are generating the Terms of Service page for {{business_name}}.

## Hard constraints (A2P-critical)

This page's SMS section MUST mirror the carrier-registered A2P submission. The text in section 6.1-6.8 cannot be edited per-client without re-registering the carrier campaign.

## Required sections

1. Effective date (use today's date in brand-config-style format)
2. § 1 — Acceptance
3. § 2 — Services description (1-2 paragraphs, niche-appropriate)
4. § 3 — User obligations
5. § 4 — Intellectual property
6. § 5 — Disclaimers + limitations
7. § 6 — **SMS Terms** (REQUIRED — carrier A2P critical):
   - 6.1 Program description (mention `{{brand.legal_entity}}` and `{{brand.dba}}` as DBA if different)
   - 6.2 Sample messages list — render ALL entries from `brand.a2p.sample_messages[]` verbatim
   - 6.3 Frequency (e.g., "up to 4 messages per month")
   - 6.4 Carrier disclaimer ("Message and data rates may apply")
   - 6.5 Opt-out ("Reply STOP to unsubscribe")
   - 6.6 Help ("Reply HELP for help")
   - 6.7 Privacy reference (link to /privacy)
   - 6.8 Supported carriers note ("Carriers are not liable for delayed or undelivered messages")
8. § 7 — Governing law (state from `brand.contact.address`)
9. § 8 — Contact

## Output format

Return a complete `src/app/terms/page.tsx` file. Single fenced ```tsx code block.
