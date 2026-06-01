import brand from "../../brand-config.json";

/**
 * Social icon row — pulls handles from `brand.socials` (instagram, facebook,
 * tiktok, youtube, linkedin). Renders one icon per non-empty handle.
 */
type SocialKey = "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin";

const URL_BUILDERS: Record<SocialKey, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  linkedin: (h) => `https://www.linkedin.com/company/${h}`,
};

const LABELS: Record<SocialKey, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

function Icon({ kind }: { kind: SocialKey }) {
  if (kind === "instagram") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
        <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5H17V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.8V10.5H8.5v3h2.5V21h2.5z" />
      </svg>
    );
  }
  if (kind === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
        <path d="M16.5 3c.3 1.7 1.3 3 2.9 3.6.5.2 1 .3 1.6.4v3.1c-1.6 0-3-.4-4.4-1.3v6.4a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.7 2.4V3h3z" />
      </svg>
    );
  }
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5 3-5 3z" />
      </svg>
    );
  }
  // linkedin
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M4.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM3 8.5h3v11.5H3V8.5zM9 8.5h2.8v1.6h.1c.4-.7 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V20h-3v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H9V8.5z" />
    </svg>
  );
}

export function Socials({
  className = "",
  iconClassName = "",
}: {
  className?: string;
  iconClassName?: string;
}) {
  const keys: SocialKey[] = ["instagram", "facebook", "tiktok", "youtube", "linkedin"];
  const socials = (brand.socials ?? {}) as Record<string, string | undefined>;
  return (
    <ul className={`flex items-center gap-3 ${className}`}>
      {keys.map((k) => {
        const handle = socials[k];
        if (!handle) return null;
        return (
          <li key={k}>
            <a
              href={URL_BUILDERS[k](handle)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${LABELS[k]} — ${handle}`}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${iconClassName}`}
            >
              <Icon kind={k} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
