import { useEffect, useState } from "react";
import "./client-review-section.css";

const testimonials = [
  {
    quote:
      "Cedar Payroll transformed our payroll operations and gave us confidence that every payroll cycle would be accurate and compliant.",
    name: "Sam Quinn",
    role: "Payroll Manager At THINK",
  },
  {
    quote:
      "Cedar Payroll streamlined our complex multi-location payroll and eliminated the errors we used to struggle with. Now every cycle runs smoothly and our team has complete peace of mind.",
    name: "Laura Chen",
    role: "Payroll Manager & HR At COCO GRILL",
  },
  {
    quote:
      "Switching to Cedar Payroll was a game-changer. The compliance features keep us aligned with regulations, and the automation saves hours of manual work each month.",
    name: "David Morales",
    role: "Payroll Supervisor At Haberdashers’ Academies Trust South",
  },
];

const slides = [
  testimonials[testimonials.length - 1],
  ...testimonials,
  testimonials[0],
];

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {dir === "prev" ? (
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M9.5 5.5 16 12l-6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const TestimonialsSection = () => {
  const [index, setIndex] = useState(1);
  const [sliding, setSliding] = useState(true);
  const [paused, setPaused] = useState(false);
  const last = slides.length - 1;

  const go = (dir) => {
    setIndex((current) => current + dir);
  };

  const onSlideEnd = () => {
    if (index === last) {
      setSliding(false);
      setIndex(1);
    } else if (index === 0) {
      setSliding(false);
      setIndex(testimonials.length);
    }
  };

  useEffect(() => {
    if (sliding) return undefined;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSliding(true));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sliding]);

  useEffect(() => {
    if (paused || !sliding) return undefined;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return undefined;

    const timer = window.setInterval(() => go(1), 4000);
    return () => window.clearInterval(timer);
  }, [paused, sliding, index]);

  return (
    <section className="testimonials-section" id="testimonials">
      <div className="testimonials-container">
        <div
          className="testimonials-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button
            type="button"
            className="testimonials-arrow testimonials-arrow--prev"
            aria-label="Previous testimonial"
            onClick={() => go(-1)}
          >
            <Chevron dir="prev" />
          </button>

          <div className="testimonials-viewport">
            <div
              className={`testimonials-track${sliding ? " is-sliding" : ""}`}
              style={{ transform: `translateX(-${index * 100}%)` }}
              onTransitionEnd={onSlideEnd}
            >
              {slides.map((item, slideIndex) => (
                <article className="testimonials-card" key={slideIndex}>
                  <h2 className="testimonials-heading">Meet our clients</h2>
                  <p className="testimonials-quote">“{item.quote}”</p>
                  <p className="testimonials-author">
                    <span>{item.name}</span>
                    {item.role}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="testimonials-arrow testimonials-arrow--next"
            aria-label="Next testimonial"
            onClick={() => go(1)}
          >
            <Chevron dir="next" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
