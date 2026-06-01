import Image from "next/image";
import brand from "../../brand-config.json";

/**
 * Brand-mark — renders the client's white-on-transparent wordmark/logo for
 * use on dark surfaces (header / footer). Asset path is driven by
 * brand.logo_white_path with a fallback to brand.logo_path. The Generate-Site
 * pipeline drops the asset(s) into /public/brand/ as part of repo scaffolding.
 *
 * Sized via the `size` prop. The asset's true dimensions are unknown at
 * compile-time (we don't ship a placeholder); we declare a stable intrinsic
 * width/height pair for next/image and let CSS control the rendered box.
 */

export function BrandMark({
  className = "",
  size = "md",
  inverse: _inverse = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
}) {
  // Heights — width caps at 4× height to prevent overflow on wide wordmarks.
  const h = size === "lg" ? 80 : size === "sm" ? 36 : 56;
  const src = brand.logo_white_path ?? brand.logo_path ?? "/brand/logo.png";
  return (
    <Image
      src={src}
      alt={brand.company}
      width={800}
      height={400}
      priority
      className={`block ${className}`}
      style={{ height: `${h}px`, width: "auto", maxWidth: `${h * 4}px` }}
    />
  );
}
