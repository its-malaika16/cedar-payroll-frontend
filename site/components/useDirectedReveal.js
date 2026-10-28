import { useEffect } from "react";

export function useDirectedReveal(containerRef, selector, { once = false } = {}) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const nodes = [...root.querySelectorAll(selector)];
    if (!nodes.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-inview"));
      return;
    }

    let lastY = window.scrollY;
    let direction = "down";
    const seen = new Set();

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 3) return;
      direction = y > lastY ? "down" : "up";
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const node = entry.target;
          if (entry.isIntersecting) {
            if (once && seen.has(node)) return;
            seen.add(node);
            node.classList.toggle("from-above", direction === "up");
            node.classList.toggle("from-below", direction !== "up");
            requestAnimationFrame(() => {
              requestAnimationFrame(() => node.classList.add("is-inview"));
            });
            if (once) observer.unobserve(node);
          } else if (!once) {
            node.classList.remove("is-inview", "from-above", "from-below");
          }
        });
      },
      { threshold: 0.08, rootMargin: "60px 0px 40px 0px" },
    );

    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, selector, once]);
}
