"use client";

import { useEffect, useRef } from "react";

/**
 * MotionProvider — 全局动效增强（无业务耦合）
 * 1) IntersectionObserver 驱动 .reveal / .reveal-lines 进入视口揭示
 * 2) 桌面端自定义光标（光点 + 延迟光环），hover 可交互元素时放大
 * 3) .magnetic 元素鼠标靠近时的轻微磁吸位移
 * 尊重 prefers-reduced-motion 与触屏设备，全部优雅降级。
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // ---- Reveal on scroll ----
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".reveal, .reveal-lines"));
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((node) => node.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      );
      targets.forEach((node) => observer.observe(node));

      // 动态内容（路由切换/流式渲染）用 MutationObserver 补挂
      const mutation = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.classList.contains("reveal") || node.classList.contains("reveal-lines")) {
              observer.observe(node);
            }
            node.querySelectorAll?.(".reveal, .reveal-lines").forEach((child) => observer.observe(child));
          });
        });
      });
      mutation.observe(document.body, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
        mutation.disconnect();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !finePointer || window.innerWidth < 1024) return;

    document.body.classList.add("has-custom-cursor");
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf = 0;

    const onMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest("button, a, input, select, textarea, [role='button'], .magnetic");
      ring.classList.toggle("is-hovering", Boolean(interactive));
    };

    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const loop = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // ---- Magnetic buttons ----
    const magnetics = Array.from(document.querySelectorAll<HTMLElement>(".magnetic"));
    const cleanupMagnetics: Array<() => void> = [];
    magnetics.forEach((node) => {
      const onMagMove = (event: MouseEvent) => {
        const rect = node.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.18;
        const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.18;
        node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      };
      const onMagLeave = () => {
        node.style.transform = "translate3d(0, 0, 0)";
      };
      node.addEventListener("mousemove", onMagMove);
      node.addEventListener("mouseleave", onMagLeave);
      cleanupMagnetics.push(() => {
        node.removeEventListener("mousemove", onMagMove);
        node.removeEventListener("mouseleave", onMagLeave);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      document.body.classList.remove("has-custom-cursor");
      cleanupMagnetics.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      {children}
    </>
  );
}
