const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconFeatureDocument() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.2 2H7.1C5.9 2 5 2.9 5 4.1v15.8C5 21.1 5.9 22 7.1 22h9.8c1.2 0 2.1-.9 2.1-2.1V8.2L14.2 2z"
      />
      <path fill="#fff" d="M14.2 2v5.1c0 .6.5 1.1 1.1 1.1H20" />
      <path
        fill="#fff"
        d="M8.2 12.1h7.6v1.45H8.2zm0 3.1h7.6v1.45H8.2zm0 3.1h4.8v1.45H8.2z"
      />
    </svg>
  );
}

export function IconFeatureCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.2 2.3h1.7v1.7h4.2V2.3h1.7v1.7H19a2.1 2.1 0 0 1 2.1 2.1v13.7A2.1 2.1 0 0 1 19 21.9H5a2.1 2.1 0 0 1-2.1-2.1V6.1A2.1 2.1 0 0 1 5 4h3.2V2.3z"
      />
      <rect fill="#fff" x="7.1" y="11.6" width="1.8" height="1.8" rx="0.35" />
      <rect fill="#fff" x="11.1" y="11.6" width="1.8" height="1.8" rx="0.35" />
      <rect fill="#fff" x="15.1" y="11.6" width="1.8" height="1.8" rx="0.35" />
      <rect fill="#fff" x="7.1" y="15.7" width="1.8" height="1.8" rx="0.35" />
      <rect fill="#fff" x="11.1" y="15.7" width="1.8" height="1.8" rx="0.35" />
      <rect fill="#fff" x="15.1" y="15.7" width="1.8" height="1.8" rx="0.35" />
    </svg>
  );
}

export function IconFeatureLock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.4a4.6 4.6 0 0 1 4.6 4.6V9h1.1c1.2 0 2.2 1 2.2 2.2v8.2c0 1.2-1 2.2-2.2 2.2H6.3c-1.2 0-2.2-1-2.2-2.2v-8.2C4.1 10 5.1 9 6.3 9h1.1V7c0-2.5 2.1-4.6 4.6-4.6zm2.7 6.6V7a2.7 2.7 0 0 0-5.4 0v2h5.4z"
      />
      <circle fill="#fff" cx="12" cy="15.1" r="1.35" />
      <rect fill="#fff" x="11.35" y="15.4" width="1.3" height="2.6" rx="0.55" />
    </svg>
  );
}

export function IconFeaturePeople() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle fill="currentColor" cx="9.1" cy="8.1" r="3.1" />
      <path
        fill="currentColor"
        d="M3.4 19.8c.3-3.6 2.8-5.8 5.7-5.8s5.4 2.2 5.7 5.8c.1.6-.4 1.2-1 1.2H4.4c-.6 0-1.1-.6-1-1.2z"
      />
      <circle fill="currentColor" cx="16.4" cy="8.6" r="2.55" />
      <path
        fill="currentColor"
        d="M14.2 14.5c1.4-.7 3.1-.7 4.6.1 1.5.9 2.4 2.5 2.6 4.3.1.6-.4 1.1-.9 1.1h-4.4c.5-1.7.4-3.6-.2-5.2-.5-.1-1.1-.2-1.7-.3z"
      />
    </svg>
  );
}

export function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.6h7.1L19 8.4V20.4H7z" {...stroke} />
      <path d="M14.1 3.6V8.4H19M9.3 12.2h6.4M9.3 15.6h6.4" {...stroke} />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" {...stroke} />
      <path d="M4 10h16M8 3.6V7M16 3.6V7" {...stroke} />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="11" width="12" height="9" rx="1.6" {...stroke} />
      <path d="M8.3 11V8.5a3.7 3.7 0 0 1 7.4 0V11" {...stroke} />
    </svg>
  );
}

export function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8.2" r="2.4" {...stroke} />
      <circle cx="15.5" cy="8.2" r="2.4" {...stroke} />
      <path d="M5.4 18.4c.5-3 2.5-4.6 4.8-4.6s4.3 1.6 4.8 4.6M13.4 13.9c1.6-.4 3.4.4 4.6 2.4.6 1 .8 1.8.8 2.1" {...stroke} />
    </svg>
  );
}

export function IconFeatureCoins() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <path d="M4.6 15.85v3.25c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7v-3.25c-1.7 1.1-4.4 1.75-7.4 1.75s-5.7-.65-7.4-1.75z" />
        <ellipse cx="12" cy="15.85" rx="7.4" ry="2.5" />
        <path d="M4.6 10.15v3.25c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7v-3.25c-1.7 1.1-4.4 1.75-7.4 1.75s-5.7-.65-7.4-1.75z" />
        <ellipse cx="12" cy="10.15" rx="7.4" ry="2.5" />
        <path d="M4.6 4.45v3.25c0 1.5 3.3 2.7 7.4 2.7s7.4-1.2 7.4-2.7V4.45c-1.7 1.1-4.4 1.75-7.4 1.75s-5.7-.65-7.4-1.75z" />
        <ellipse cx="12" cy="4.45" rx="7.4" ry="2.5" />
      </g>
    </svg>
  );
}

export function IconFeatureGlobe() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.35"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.35"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="3.35"
        ry="8.35"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.35"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="8.35"
        ry="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.35"
      />
    </svg>
  );
}

export function IconFeatureFx() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.4 5.35H7.55L9.7 3.2A1.2 1.2 0 1 0 8 1.5L3.15 6.35a1.2 1.2 0 0 0 0 1.7L8 12.9A1.2 1.2 0 1 0 9.7 11.2L7.55 9.05H20.4a1.5 1.5 0 0 0 0-3z"
      />
      <path
        fill="currentColor"
        d="M3.6 18.65h12.85L14.3 20.8a1.2 1.2 0 1 0 1.7 1.7l4.85-4.85a1.2 1.2 0 0 0 0-1.7L16 11.1a1.2 1.2 0 1 0-1.7 1.7l2.15 2.15H3.6a1.5 1.5 0 0 0 0 3z"
      />
    </svg>
  );
}

export function IconCoins() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="7.2" rx="5.6" ry="2.1" {...stroke} />
      <path d="M6.4 7.2v3.6c0 1.2 2.5 2.1 5.6 2.1s5.6-.9 5.6-2.1V7.2" {...stroke} />
      <path d="M6.4 10.8v3.6c0 1.2 2.5 2.1 5.6 2.1s5.6-.9 5.6-2.1v-3.6" {...stroke} />
      <path d="M6.4 14.4v3.4c0 1.2 2.5 2.1 5.6 2.1s5.6-.9 5.6-2.1v-3.4" {...stroke} />
    </svg>
  );
}

export function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M4.4 12h15.2M12 4c2.2 2.5 3.3 5.2 3.3 8s-1.1 5.5-3.3 8c-2.2-2.5-3.3-5.2-3.3-8s1.1-5.5 3.3-8z" {...stroke} />
    </svg>
  );
}

export function IconFx() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 9.2H19M15.6 6.2 19 9.2l-3.4 3" {...stroke} />
      <path d="M15.8 14.8H5M8.4 17.8 5 14.8l3.4-3" {...stroke} />
    </svg>
  );
}

export function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.6 19 6.5v5.3c0 4.1-2.8 7.4-7 8.7-4.2-1.3-7-4.6-7-8.7V6.5z" {...stroke} />
      <path d="M8.7 12.2 11 14.5l4.5-4.8" {...stroke} />
    </svg>
  );
}

export function IconLink() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.4 14.6a3.4 3.4 0 0 1 0-4.8l2.4-2.4a3.4 3.4 0 0 1 4.8 4.8l-1.2 1.2" {...stroke} />
      <path d="M14.6 9.4a3.4 3.4 0 0 1 0 4.8l-2.4 2.4a3.4 3.4 0 1 1-4.8-4.8l1.2-1.2" {...stroke} />
    </svg>
  );
}

export function IconAccount() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="9" r="2.4" {...stroke} />
      <path d="M5.4 18.2c.5-2.7 2.3-4.1 4.6-4.1s4.1 1.4 4.6 4.1" {...stroke} />
      <path d="M16.2 10.2c1.2.4 2 1.4 2 2.6 0 1.2-.8 2.2-2 2.6" {...stroke} />
      <path d="M18.6 8c1.8.6 3 2.1 3 4.8s-1.2 4.2-3 4.8" {...stroke} />
    </svg>
  );
}

const solutionStroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconSolutionShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.4 19.1 6.6v5.4c0 4.3-3.1 7.8-7.1 9.1-4-1.3-7.1-4.8-7.1-9.1V6.6z"
        {...solutionStroke}
      />
      <path d="M8.5 12.2 11 14.6l4.7-5" {...solutionStroke} />
    </svg>
  );
}

export function IconSolutionLink() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="2.6"
        y="10.1"
        width="9.2"
        height="4.6"
        rx="2.3"
        transform="rotate(-38 7.2 12.4)"
        {...solutionStroke}
      />
      <rect
        x="12.2"
        y="9.3"
        width="9.2"
        height="4.6"
        rx="2.3"
        transform="rotate(-38 16.8 11.6)"
        {...solutionStroke}
      />
    </svg>
  );
}

export function IconSolutionAccount() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.1" cy="8.2" r="2.15" {...solutionStroke} />
      <path d="M4.6 17.6c.35-2.4 1.9-3.7 3.5-3.7s3.15 1.3 3.5 3.7" {...solutionStroke} />
      <circle cx="13.35" cy="8.85" r="1.85" {...solutionStroke} />
      <path d="M10.7 15.4c.7-1.5 1.9-2.3 3.2-2.3 1.1 0 2.1.5 2.7 1.6" {...solutionStroke} />
      <path d="M16.35 11.1c1.15.45 1.9 1.45 1.9 2.65" {...solutionStroke} />
      <path d="M18.55 9.15c1.7.65 2.75 2.05 2.75 4.05" {...solutionStroke} />
    </svg>
  );
}

export function IconBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.8 13.7 8l4.6.4-3.5 3.1 1.1 4.5L12 13.8 8.1 16l1.1-4.5L5.7 8.4 10.3 8z" {...stroke} />
    </svg>
  );
}

export function IconClock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M12 7.6V12l3.2 2" {...stroke} />
    </svg>
  );
}

export function CircleIcon({ variant = "outline", children }) {
  return <span className={`home-circle-icon home-circle-icon--${variant}`}>{children}</span>;
}
