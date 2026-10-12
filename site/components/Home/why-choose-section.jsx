import "./why-choose-section.css";

const benefits = [
    {
        icon: "/assets/icons/hmrc.svg",
        title: "HMRC Compliant",
        description:
            "Stay fully compliant with all HMRC regulations and avoid costly penalties.",
    },
    {
        icon: "/assets/icons/badge.svg",
        title: "Expert Support",
        description:
            "Dedicated payroll specialists available to handle your complex requirements.",
    },
    {
        icon: "/assets/icons/clock.svg",
        title: "Save Time",
        description:
            "Automate your payroll processes and focus on growing your business.",
    },
];

const WhyChooseSection = () => {
    return (
        <section className="why-choose">
            <div className="why-choose-container">
                <div className="why-choose-header">
                    <h2 className="why-choose-title main-title">
                        Why Choose Cedar Payroll?
                    </h2>

                    <p className="why-choose-subtitle">
                        We combine cutting-edge technology with expert
                        knowledge to deliver payroll services that your
                        business can rely on.
                    </p>
                </div>

                <div className="why-choose-grid">
                    {benefits.map((item, index) => (
                        <div className="benefit-card" key={index}>
                            <div className="benefit-icon-wrapper">
                                <img
                                    src={item.icon} />
                            </div>

                            <h3 className="benefit-title">
                                {item.title}
                            </h3>

                            <p className="benefit-description body-5">
                                {item.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section >
    );
};

export default WhyChooseSection;