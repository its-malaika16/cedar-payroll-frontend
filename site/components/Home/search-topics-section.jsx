import { Link } from "react-router-dom";
import ScrollReveal from "../ScrollReveal";
import "./search-topics-section.css";

const topics = [
  {
    title: "UK payroll software",
    body: "Cedar Payroll is UK payroll software for PAYE, HMRC RTI, tax, National Insurance, payslips, and statutory forms including P11, P45, P60, P11D and PBIK.",
  },
  {
    title: "HR software UK",
    body: "Run UK HR alongside pay: employee records, leave, rota, attendance, clock-in, and an employee self-service portal on web, iPhone and Android.",
  },
  {
    title: "Payroll bureau software",
    body: "Accountants and bureaux can process multiple employers, generate forms, and keep company and bureau information in one place.",
  },
];

const faqs = [
  {
    q: "What is Cedar Payroll?",
    a: "Cedar Payroll is UK payroll software and HR for employers, payroll bureaux, and employees, with HMRC RTI, payslips, leave, and mobile apps.",
  },
  {
    q: "Is Cedar Payroll UK payroll software?",
    a: "Yes. It is built for UK PAYE, HMRC Real Time Information, tax, National Insurance, and UK statutory payroll forms.",
  },
  {
    q: "Does Cedar Payroll include HR?",
    a: "Yes. Employers can manage employee records, leave, rotas, attendance and clock-in, and staff can use a self-service portal.",
  },
];

export default function SearchTopicsSection() {
  return (
    <ScrollReveal className="search-topics">
      <div className="search-topics-inner">
        <p className="cedar-kicker">UK payroll and HR</p>
        <h2>UK payroll software and HR for employers</h2>
        <p className="search-topics-lead">
          Search for Cedar Payroll, UK payroll software, or HR software UK and you should find this product: cloud pay,
          HMRC filing, and people management in one system.
        </p>
        <div className="search-topics-grid">
          {topics.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <p className="search-topics-more">
          <Link to="/uk-payroll-software">Read more about UK payroll software</Link>
          {" · "}
          <Link to="/services">What we offer</Link>
          {" · "}
          <Link to="/contact">Request a quote</Link>
        </p>
        <section className="search-topics-faq" aria-labelledby="payroll-faq-heading">
          <h2 id="payroll-faq-heading">Common questions</h2>
          {faqs.map((item) => (
            <div key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </div>
          ))}
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </ScrollReveal>
  );
}
