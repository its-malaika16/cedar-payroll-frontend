import { Link } from "react-router-dom";
import "../components/Home/search-topics-section.css";

export default function UkPayrollSoftwarePage() {
  return (
    <main className="search-topics" style={{ paddingTop: 48 }}>
      <div className="search-topics-inner">
        <p className="cedar-kicker">Cedar Payroll</p>
        <h1>UK payroll software and HR software for employers</h1>
        <p className="search-topics-lead">
          Cedar Payroll is UK payroll software built for PAYE employers, payroll bureaux, and employees. Use it to run
          pay, file with HMRC, manage HR, and give staff a self-service app.
        </p>

        <section>
          <h2>UK payroll software</h2>
          <p>
            Run UK payroll in one place: pay runs, tax and National Insurance, HMRC Real Time Information (RTI),
            payslips, and statutory forms (P11, P45, P60, P11D and PBIK). Cedar Payroll is designed for United Kingdom
            payroll rules, not a generic overseas package with a UK label.
          </p>
        </section>

        <section>
          <h2>HR software UK employers can use with payroll</h2>
          <p>
            HR sits next to pay: employee records, leave and holidays, rotas, attendance and clock-in, with an employee
            portal on the web and on iOS and Android. Staff use the same login as cedarpayroll.com.
          </p>
        </section>

        <section>
          <h2>Who Cedar Payroll is for</h2>
          <p>
            Employers who want UK payroll software without a separate HR tool. Bureaux that process many companies.
            Employees who need payslips, leave requests, and clock-in on their phone.
          </p>
        </section>

        <p className="search-topics-more">
          <Link to="/contact">Contact Cedar Payroll</Link>
          {" · "}
          <Link to="/services">See what we offer</Link>
          {" · "}
          <Link to="/about">About the company</Link>
        </p>
      </div>
    </main>
  );
}
