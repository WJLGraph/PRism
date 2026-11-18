"use client";

import { useEffect, useRef, useState } from "react";

const INTRO_KEY = "prism.intro.seen";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const [introVisible, setIntroVisible] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || window.sessionStorage.getItem(INTRO_KEY)) {
      setIntroVisible(false);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1350);
      const eased = 1 - Math.pow(1 - progress, 3);
      setIntroProgress(Math.round(eased * 100));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(INTRO_KEY, "1");
      setIntroVisible(false);
    }, 1650);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observed = new WeakSet<Element>();
    const reveal = (node: Element) => {
      if (observed.has(node)) return;
      observed.add(node);
      if (reduced || !("IntersectionObserver" in window)) node.classList.add("is-visible");
      else observer.observe(node);
    };
    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(".reveal, .reveal-lines")) reveal(root);
      root.querySelectorAll?.(".reveal, .reveal-lines").forEach(reveal);
    };
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );
    scan(document);
    const mutation = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) scan(node);
    })));
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !finePointer || window.innerWidth < 1024) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add("has-custom-cursor");
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;
    let magnetic: HTMLElement | null = null;

    const onMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      const target = event.target as HTMLElement | null;
      const nextMagnetic = target?.closest<HTMLElement>(".magnetic") ?? null;
      if (magnetic && magnetic !== nextMagnetic) magnetic.style.transform = "translate3d(0,0,0)";
      magnetic = nextMagnetic;
      if (magnetic) {
        const rect = magnetic.getBoundingClientRect();
        const dx = (event.clientX - rect.left - rect.width / 2) * 0.12;
        const dy = (event.clientY - rect.top - rect.height / 2) * 0.12;
        magnetic.style.transform = `translate3d(${dx}px,${dy}px,0)`;
      }
    };
    const onOver = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      ring.classList.toggle("is-hovering", Boolean(target?.closest("button, a, input, select, textarea, [role='button']")));
    };
    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    const loop = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      magnetic?.style.removeProperty("transform");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      document.body.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      {introVisible && (
        <div className={`prism-intro ${introProgress === 100 ? "is-leaving" : ""}`} aria-hidden>
          <div className="prism-intro-word">PR<span>ism</span></div>
          <div className="prism-intro-meta"><span>Engineering intelligence</span><span>{String(introProgress).padStart(3, "0")}</span></div>
        </div>
      )}
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      {children}
    </>
  );
}
