"use client";

// Kinetic type — real 21st.dev components, ported verbatim + tailored:
//  - VerticalCutReveal (Daniel Petho) — character/word cut-up reveal for headlines
//  - TextRevealByWord (magicui) — scroll-linked word-by-word manifesto reveal
//  - CutHeading — in-view trigger wrapper so below-fold headlines reveal on scroll

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo,
  useRef, useState, type ReactNode, type FC,
} from "react";
import {
  motion, type MotionValue,
  useScroll, useTransform, useInView,
} from "framer-motion";

type AnimTransition = Record<string, unknown>;
import { cn } from "@/lib/utils";

interface TextProps {
  children: ReactNode;
  reverse?: boolean;
  transition?: AnimTransition;
  splitBy?: "words" | "characters" | "lines" | string;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number;
  containerClassName?: string;
  wordLevelClassName?: string;
  elementLevelClassName?: string;
  autoStart?: boolean;
}
export interface VerticalCutRevealRef { startAnimation: () => void; reset: () => void }
interface WordObject { characters: string[]; needsSpace: boolean }

export const VerticalCutReveal = forwardRef<VerticalCutRevealRef, TextProps>(
  ({ children, reverse = false, transition = { type: "spring", stiffness: 190, damping: 22 },
     splitBy = "words", staggerDuration = 0.16, staggerFrom = "first",
     containerClassName, wordLevelClassName, elementLevelClassName, autoStart = true }, ref) => {
    const text = typeof children === "string" ? children : children?.toString() || "";
    const [isAnimating, setIsAnimating] = useState(false);
    const splitIntoCharacters = (t: string): string[] => {
      if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
        return Array.from(seg.segment(t), ({ segment }) => segment);
      }
      return Array.from(t);
    };
    const elements = useMemo(() => {
      const words = text.split(" ");
      if (splitBy === "characters") return words.map((w, i) => ({ characters: splitIntoCharacters(w), needsSpace: i !== words.length - 1 }));
      return splitBy === "words" ? text.split(" ") : splitBy === "lines" ? text.split("\n") : text.split(splitBy);
    }, [text, splitBy]);
    const getStaggerDelay = useCallback((index: number) => {
      const total = splitBy === "characters"
        ? (elements as WordObject[]).reduce((acc, w) => acc + (typeof w === "string" ? 1 : w.characters.length + (w.needsSpace ? 1 : 0)), 0)
        : elements.length;
      if (staggerFrom === "first") return index * staggerDuration;
      if (staggerFrom === "last") return (total - 1 - index) * staggerDuration;
      if (staggerFrom === "center") return Math.abs(Math.floor(total / 2) - index) * staggerDuration;
      return Math.abs((staggerFrom as number) - index) * staggerDuration;
    }, [elements, staggerFrom, staggerDuration, splitBy]);
    const startAnimation = useCallback(() => setIsAnimating(true), []);
    useImperativeHandle(ref, () => ({ startAnimation, reset: () => setIsAnimating(false) }));
    useEffect(() => { if (autoStart) startAnimation(); }, [autoStart, startAnimation]);
    const variants = {
      hidden: { y: reverse ? "-110%" : "110%" },
      visible: (i: number) => ({ y: 0, transition: { ...transition, delay: ((transition?.delay as number) || 0) + getStaggerDelay(i) } }),
    };
    return (
      <span className={cn(containerClassName, "flex flex-wrap whitespace-pre-wrap", splitBy === "lines" && "flex-col")}>
        <span className="sr-only">{text}</span>
        {(splitBy === "characters" ? (elements as WordObject[]) : (elements as string[]).map((el, i) => ({ characters: [el], needsSpace: i !== elements.length - 1 }))).map((wordObj, wordIndex, array) => {
          const prev = array.slice(0, wordIndex).reduce((s, w) => s + w.characters.length, 0);
          return (
            // max-w-full so a word that is wider than its container WRAPS instead of
            // being chopped mid-letter: overflow-hidden is here for the vertical cut
            // reveal, but it clips horizontally too, which shipped headings reading
            // "BUILT AROU / YOUR BUSIN" on the live franchi-law lander (2026-07-24).
            <span key={wordIndex} aria-hidden className={cn("inline-flex max-w-full overflow-hidden", wordLevelClassName)}>
              {wordObj.characters.map((char, charIndex) => (
                <span className={cn(elementLevelClassName, "whitespace-pre-wrap relative")} key={charIndex}>
                  <motion.span custom={prev + charIndex} initial="hidden" animate={isAnimating ? "visible" : "hidden"} variants={variants} className="inline-block">{char}</motion.span>
                </span>
              ))}
              {wordObj.needsSpace && <span> </span>}
            </span>
          );
        })}
      </span>
    );
  }
);
VerticalCutReveal.displayName = "VerticalCutReveal";

/** In-view trigger wrapper for below-the-fold kinetic headlines */
export function CutHeading({ text, className = "", splitBy = "words", stagger = 0.06 }: { text: string; className?: string; splitBy?: "words" | "characters"; stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const r = useRef<VerticalCutRevealRef>(null);
  useEffect(() => { if (inView) r.current?.startAnimation(); }, [inView]);
  return (
    <div ref={ref} className={className}>
      <VerticalCutReveal ref={r} autoStart={false} splitBy={splitBy} staggerDuration={stagger} staggerFrom="first">{text}</VerticalCutReveal>
    </div>
  );
}

/** Scroll-linked word-by-word manifesto reveal */
export const TextRevealByWord: FC<{ text: string; className?: string }> = ({ text, className }) => {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: targetRef });
  const words = text.split(" ");
  return (
    <div ref={targetRef} className={cn("relative z-0 h-[200vh]", className)}>
      <div className="sticky top-0 mx-auto flex h-[100dvh] max-w-5xl items-center px-6">
        <p className="flex flex-wrap font-[family-name:var(--font-display)] font-semibold leading-[1.08]" style={{ fontSize: "clamp(1.8rem,4.5vw,4rem)", letterSpacing: "-0.02em" }}>
          {words.map((word, i) => {
            const start = i / words.length;
            const end = start + 1 / words.length;
            return <Word key={i} progress={scrollYProgress} range={[start, end]}>{word}</Word>;
          })}
        </p>
      </div>
    </div>
  );
};
const Word: FC<{ children: ReactNode; progress: MotionValue<number>; range: [number, number] }> = ({ children, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <span className="relative mx-1.5 lg:mx-2.5">
      <span className="absolute" style={{ color: "rgba(244,242,236,0.14)" }}>{children}</span>
      <motion.span style={{ opacity, color: "var(--ink)" }}>{children}</motion.span>
    </span>
  );
};
