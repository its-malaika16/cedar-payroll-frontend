import { useRef } from "react";
import ScrollReveal from "../ScrollReveal";
import { useDirectedReveal } from "../useDirectedReveal";
import "./industries-section.css";

const industries = [
  {
    title: "Hospitality",
    image: "/assets/images/industries/hospitality.png",
    description:
      "Streamlined payroll for restaurants, hotels, and leisure businesses.",
  },
  {
    title: "Retail",
    image: "/assets/images/industries/retail.png",
    description:
      "Efficient payroll management for retail chains and part-time teams.",
  },
  {
    title: "Construction",
    image: "/assets/images/industries/construction.png",
    description:
      "Manage complex payroll structures with ease, including site-based teams.",
  },
  {
    title: "Technology",
    image: "/assets/images/industries/technology.png",
    description:
      "Scalable payroll solutions for fast-growing tech companies.",
  },
  {
    title: "Healthcare",
    image: "/assets/images/industries/healthcare.png",
    description:
      "Reliable and accurate payroll for clinics, hospitals and healthcare professionals.",
  },
  {
    title: "Education",
    image: "/assets/images/industries/education.png",
    description:
      "Payroll services for schools, colleges and training centres.",
  },
];

const IndustriesSection = () => {
  const listRef = useRef(null);
  useDirectedReveal(listRef, ".industry-row");

  return (
    <section className="industries-section" id="industries">
      <div className="industries-container">
        <ScrollReveal as="div" className="industries-intro">
          <h2 className="industries-heading">Industries we serve</h2>
          <p className="industries-lead">
            Every industry has unique payroll needs. Our flexible solutions adapt
            to your business, ensuring compliance, efficiency, and peace of mind.
          </p>
        </ScrollReveal>

        <ol className="industries-list" ref={listRef}>
          {industries.map((industry, index) => (
            <li className="industry-row" key={industry.title}>
              <span className="industry-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="industry-copy">
                <h3 className="industry-title">{industry.title}</h3>
                <p className="industry-description">{industry.description}</p>
              </div>
              <img
                className="industry-photo"
                src={industry.image}
                alt=""
                width={index === 5 ? 449 : 438}
                height={180}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default IndustriesSection;
