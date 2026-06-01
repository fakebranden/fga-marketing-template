# Per-page contract: BOOK (/book) — only generated if `brand.has_booking !== false`

You are generating the booking/contact page for {{business_name}}.

## Hard constraints (A2P + GHL critical)

- The form MUST POST to `/api/book` (the audit-trail route — DO NOT bypass)
- Phone input MUST be accompanied by `<SmsConsent />` (build-blocking)
- The unchecked-by-default SMS consent checkbox is required — pre-checking it kills A2P approval
- Form fields must match the GHL pipeline tags in `brand.ghl.tags`

## Required sections

1. Hero — niche-appropriate ("Reserve a booth" for lounge, "Book the truck" for food truck, etc.)
2. Form:
   - Name (required)
   - Email (required)
   - Phone (required for SMS) + `<SmsConsent legal_entity={brand.legal_entity} dba={brand.dba} sample_messages={brand.a2p.sample_messages} />`
   - Date/time picker (if niche needs)
   - Notes/details (optional)
   - Submit button (CTA label from `reasoning/{{niche}}.md` Copy patterns)
3. Right-rail or below: trust signals (hours, address, phone tel: link, service area map)
4. FAQ accordion specific to booking ("How early should I book?", "What's included?", "Cancellation policy?")

## Output format

Return a complete `src/app/book/page.tsx` file. Single fenced ```tsx code block.
