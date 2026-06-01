# Per-page contract: PRIVACY (/privacy)

You are generating the Privacy Policy page for {{business_name}}.

## Hard constraints (A2P-critical)

MUST include the **"mobile information not shared for marketing" carve-out** — this is THE clause that gates A2P approval. Wording must be precise.

## Required sections

1. Effective date
2. § 1 — What we collect (name, contact info, browsing data per Vercel Analytics if applicable)
3. § 2 — How we use it (service delivery, communications, analytics)
4. § 3 — **Mobile information sharing carve-out** (A2P-critical) — verbatim language:
   > "No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. All other categories of personal information exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties."
5. § 4 — Third-party services (GHL, Vercel Analytics, etc.)
6. § 5 — Cookies + tracking
7. § 6 — Your rights (data access, deletion, opt-out)
8. § 7 — Children's privacy (under 13 statement)
9. § 8 — Changes to policy
10. § 9 — Contact

## Output format

Return a complete `src/app/privacy/page.tsx` file. Single fenced ```tsx code block.
