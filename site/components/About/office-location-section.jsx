import "./office-location-section.css";

const MAP_W = 1628;
const MAP_H = 1084;

const locations = [
  {
    name: "NEW YORK,USA",
    x: 498,
    y: 358,
    lx: 498,
    ly: 118,
    anchor: "middle",
  },
  {
    name: "LONDON,UK",
    x: 736,
    y: 336,
    lx: 705,
    ly: 158,
    anchor: "middle",
  },
  {
    name: "BEIRUT",
    x: 1006,
    y: 424,
    lx: 1006,
    ly: 118,
    anchor: "middle",
  },
  {
    name: "RIYADH,KSA",
    x: 1078,
    y: 478,
    lx: 1268,
    ly: 188,
    anchor: "middle",
  },
  {
    name: "DUBAI,UAE",
    x: 1136,
    y: 506,
    lx: 1410,
    ly: 486,
    anchor: "start",
  },
];

const GlobalPresenceSection = () => {
  return (
    <section className="global-presence" id="global-presence">
      <div className="global-presence-container">
        <div className="global-header">
          <p className="cedar-kicker global-kicker">Our Global Presence</p>
          <h2 className="global-title">
            Connecting businesses across borders.
          </h2>
          <p className="global-lead">
            Our global presence enables us to support businesses across borders
            with reliable payroll solutions, local expertise, and consistent
            service wherever they operate.
          </p>
        </div>

        <div className="world-map-wrapper">
          <svg
            className="world-map-art"
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            role="img"
            aria-label="Cedar Payroll offices in New York, London, Beirut, Riyadh and Dubai"
          >
            <image
              href="/assets/redesign/world-map.png"
              xlinkHref="/assets/redesign/world-map.png"
              width={MAP_W}
              height={MAP_H}
              preserveAspectRatio="xMidYMid meet"
            />
            {locations.map((location) => (
              <g key={location.name}>
                <line
                  x1={location.lx}
                  y1={location.ly}
                  x2={location.x}
                  y2={location.y}
                  stroke="#d32027"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx={location.x} cy={location.y} r="12" fill="#d32027" />
                <text
                  x={location.lx}
                  y={location.ly - 18}
                  textAnchor={location.anchor}
                  fill="#d32027"
                  fontFamily="Montserrat, sans-serif"
                  fontWeight="800"
                  fontSize="32"
                  letterSpacing="1.4"
                >
                  {location.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
};

export default GlobalPresenceSection;
