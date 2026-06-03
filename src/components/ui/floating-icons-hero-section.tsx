"use client";

// 21st.dev — Floating Icons Hero (cursor-repelled floating icon field).
// Ported per integration spec; added `onCtaClick` so the CTA can open a popup
// (GHL booking) instead of navigating, and a `kicker` line above the title.

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface IconProps {
  id: number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  className: string;
}

export interface FloatingIconsHeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  kicker?: string;
  icons: IconProps[];
}

const Icon = ({
  mouseX, mouseY, iconData, index,
}: {
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
  iconData: IconProps;
  index: number;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  React.useEffect(() => {
    const handleMouseMove = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(mouseX.current - (rect.left + rect.width / 2), 2) +
          Math.pow(mouseY.current - (rect.top + rect.height / 2), 2)
      );
      if (distance < 150) {
        const angle = Math.atan2(
          mouseY.current - (rect.top + rect.height / 2),
          mouseX.current - (rect.left + rect.width / 2)
        );
        const force = (1 - distance / 150) * 50;
        x.set(-Math.cos(angle) * force);
        y.set(-Math.sin(angle) * force);
      } else {
        x.set(0);
        y.set(0);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y, mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("absolute", iconData.className)}
    >
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border p-3 backdrop-blur-md md:h-[4.5rem] md:w-[4.5rem]"
        style={{ background: "var(--paper-2)", borderColor: "var(--line)", boxShadow: "0 14px 34px -14px rgba(22,22,15,0.22)" }}
        animate={{ y: [0, -8, 0, 8, 0], x: [0, 6, 0, -6, 0], rotate: [0, 4, 0, -4, 0] }}
        transition={{ duration: 6 + (index % 5), repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      >
        <iconData.icon className="h-7 w-7 md:h-9 md:w-9" style={{ color: "var(--ink)" }} />
      </motion.div>
    </motion.div>
  );
};

const FloatingIconsHero = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & FloatingIconsHeroProps
>(({ className, title, subtitle, ctaText, ctaHref, onCtaClick, kicker, icons, ...props }, ref) => {
  const mouseX = React.useRef(0);
  const mouseY = React.useRef(0);
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    mouseX.current = event.clientX;
    mouseY.current = event.clientY;
  };
  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn("relative flex min-h-[88vh] w-full items-center justify-center overflow-hidden", className)}
      {...props}
    >
      <div className="absolute inset-0 h-full w-full">
        {icons.map((iconData, index) => (
          <Icon key={iconData.id} mouseX={mouseX} mouseY={mouseY} iconData={iconData} index={index} />
        ))}
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        {kicker && <p className="t-mono mb-7" style={{ color: "var(--volt)" }}>{kicker}</p>}
        <h2 className="t-display" style={{ fontSize: "clamp(2.4rem, 6vw, 5.5rem)" }}>{title}</h2>
        <p className="mx-auto mt-7 max-w-xl t-lead" style={{ color: "var(--ink-soft)" }}>{subtitle}</p>
        <div className="mt-10">
          <button type="button" onClick={onCtaClick} className="btn btn-primary" style={{ padding: "1.1rem 2.4rem", fontSize: "0.82rem" }}>
            {ctaText}
          </button>
        </div>
      </div>
    </section>
  );
});
FloatingIconsHero.displayName = "FloatingIconsHero";

export { FloatingIconsHero };
