import brand from "../../brand-config.json";

/**
 * Hero video — server-rendered, autoplay-without-sound, dual-resolution.
 *
 * Renders two <video> elements (desktop + mobile) and uses Tailwind responsive
 * `hidden`/`block` to keep the right one visible. More reliable across iOS
 * Safari than the `<source media>` pattern.
 *
 * Compliance: muted + playsinline + autoplay = browser-policy-safe autoplay
 * (Chrome, Safari, Firefox all allow muted autoplay without user interaction).
 *
 * Performance:
 *   - preload="metadata" — only headers fetched on initial paint, full video
 *     streams in once visible
 *   - fetchpriority="low" so the video doesn't compete with critical CSS/font
 *   - poster JPG renders before a single byte of video is downloaded
 */
type Props = {
  desktopSrc: string;
  mobileSrc: string;
  poster: string;
  className?: string;
  ariaLabel?: string;
};

export function HeroVideo({
  desktopSrc,
  mobileSrc,
  poster,
  className = "",
  ariaLabel,
}: Props) {
  const label = ariaLabel ?? `${brand.company} hero video`;
  const sharedProps = {
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    poster,
    preload: "metadata" as const,
    "aria-label": label,
    disablePictureInPicture: true,
    controls: false,
  };
  return (
    <>
      <video
        {...sharedProps}
        className={`${className} hidden md:block`}
        // @ts-expect-error fetchpriority is valid HTML attr; React types lag.
        fetchpriority="low"
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      <video
        {...sharedProps}
        className={`${className} block md:hidden`}
        // @ts-expect-error
        fetchpriority="low"
      >
        <source src={mobileSrc} type="video/mp4" />
      </video>
    </>
  );
}
