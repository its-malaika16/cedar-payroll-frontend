import "./platform-solution-section.css";
import DashboardDemo from "./DashboardDemo";

const solutions = [
  {
    title: "Employee Records",
    description:
      "Keep employee information organised and up to date in one secure place.",
  },
  {
    title: "Payslip Generation",
    description:
       "Create and distribute payslips in just a few clicks.",
  },
  {
    title: "Holiday & Absence Tracking",
    description:
    "Monitor leave, sickness, and attendance alongside payroll processing.",
      
  },
];

const PlatformSolutionsSection = () => {
  return (
    <section className="platform-solutions">
      <div className="platform-solutions-container">
        {/* Left Image */}

        <div className="platform-image-wrapper">
          <img src = "/assets/images/home.svg" className = "platform-image"/>
        </div>

        {/* Right Content */}

        <div className="platform-content">
          <p className="platform-heading subheading">
            Efficient & Reliable Payroll
            {/* <br /> */}
            
          </p>

          <div className="solution-list">
            {solutions.map((item, index) => (
              <div
                key={index}
                className={`solution-item ${
                  index !== solutions.length - 1
                    ? "with-border"
                    : ""
                }`}
              >
                <h3 className = "body-4">{item.title}</h3>
                <p className = "body-5">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformSolutionsSection;