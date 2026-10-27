import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const NAV_OFFSET = 96;

function scrollToHash(hash) {
  const id = hash.replace("#", "");
  if (!id) {
    window.scrollTo(0, 0);
    return;
  }
  const el = document.getElementById(id);
  if (!el) {
    window.scrollTo(0, 0);
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => scrollToHash(hash), 50);
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}
