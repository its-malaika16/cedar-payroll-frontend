import "./industries-section.css";

const industries = [
  {
    title: "Hospitality",
    image: "/assets/images/hospitality.svg",
    description:
      "Streamlined payroll for restaurants, hotels, and leisure businesses.",
  },
  {
    title: "Retail",
    image: "/assets/images/retail.svg",
    description:
      "Efficient payroll management for retail chains and part-time teams.",
  },
  {
    title: "Construction",
    image: "/assets/images/construction.svg",
    description:
      "Manage complex payroll structures with ease, including site-based teams.",
  },
  {
    title: "Technology",
    image: "/assets/images/technology.svg",
    description:
      "Scalable payroll solutions for fast-growing tech companies.",
  },
  {
    title: "Healthcare",
    image: "/assets/images/healthcare.svg",
    description:
      "Reliable and accurate payroll for clinics, hospitals and healthcare professionals.",
  },
  {
    title: "Education",
    image: "/assets/images/education.svg",
    description:
      "Payroll services for schools, colleges and training centres.",
  },
];

const IndustriesSection = () => {
  return (
    <section className="industries-section">
      <div className="industries-container">
        <p className="cedar-kicker">Industries we serve</p>
        <h2 className="industries-heading">
          Every industry has unique payroll needs.
        </h2>
        <p className="industries-lead">
          Our flexible solutions adapt to your business, ensuring compliance, efficiency, and peace of mind.
        </p>

        <div className="industries-grid">
          {industries.map((industry, index) => (
            <div className="industry-card" key={industry.title}>
              <span className="industry-number">{String(index + 1).padStart(2, "0")}</span>
              <img src={industry.image} alt="" />
              <div className="industry-content">
                <h3 className="industry-title">{industry.title}</h3>
                <p className="industry-description">{industry.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustriesSection;
