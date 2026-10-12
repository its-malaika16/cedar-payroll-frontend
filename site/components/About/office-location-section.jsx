import "./office-location-section.css";

const locations = [
    {
        name: "Delaware, USA",
        top: "16%",
        left: "20%",
    },
    {
        name: "Manchester, UK",
        top: "34%",
        left: "43%",
    },
    {
        name: "Beirut, Lebanon",
        top: "22%",
        left: "61%",
    },
    {
        name: "Dubai, UAE",
        top: "38%",
        left: "88%",
    },
];

const GlobalPresenceSection = () => {
    return (
        <section className="global-presence">
            <div className="global-presence-container">
                <div className="global-header">
                    <img
                        src="/assets/icons/globe.svg"
                        alt="Globe"
                        className="global-header-icon"
                    />
                    <h2 className="global-title main-title">
                        Our Global Presence
                    </h2>
                </div>

                <div className="world-map-wrapper">
                    <img src="/assets/images/pin.svg"
                        alt="World Map"
                        className="world-map"
                    />
                </div>

                {/* {locations.map((location, index) => (
                    <div
                        key={index}
                        className="location-marker"
                        style={{
                            top: location.top,
                            left: location.left,
                        }}
                    >
                        <p className="location-label">
                            {location.name}
                        </p>

                        <div className="location-line"></div>

                        <div className="location-dot"></div>

                        <img
                            src="/assets/icons/location.svg"
                            className = "location-pin"
                        />
                    </div>
                ))} */}
            </div>
        </section >
    );
};

export default GlobalPresenceSection;