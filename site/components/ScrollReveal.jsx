import { useEffect, useRef } from "react";
import "./scroll-reveal.css";

export default function ScrollReveal({
  as: Tag = "section",
  className = "",
  children,
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("is-inview");
      return;
    }

    let lastY = window.scrollY;
    let direction = "down";
    let revealed = false;
    let frame = 0;

    const reveal = (fromUp) => {
      if (revealed) return;
      revealed = true;
      node.classList.toggle("from-above", fromUp);
      node.classList.toggle("from-below", !fromUp);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          node.classList.add("is-inview");
        });
      });
    };

    const onScreen = () => {
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.bottom > 48 && rect.top < vh - 24;
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 3) return;
      direction = y > lastY ? "down" : "up";
      lastY = y;
      if (onScreen()) reveal(direction === "up");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reveal(direction === "up");
      },
      { threshold: 0.01, rootMargin: "80px 0px 80px 0px" },
    );

    observer.observe(node);

    const kick = () => {
      if (onScreen()) reveal(false);
    };
    const t1 = window.setTimeout(kick, 60);
    const t2 = window.setTimeout(kick, 400);

    return () => {
      revealed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <Tag ref={ref} className={`scroll-reveal ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
