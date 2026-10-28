import { useState } from "react";
import { Link } from "react-router-dom";
import ScrollReveal from "../ScrollReveal";
import { submitWebsiteEnquiry } from "../../lib/website-enquiry";
import "./contact-form-section.css";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    firstname: "",
    email: "",
    phone: "",
    company: "",
    employees: "",
    country: "United Kingdom",
    needs: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const next = {};
    if (!formData.firstname.trim()) next.firstname = "Please enter your full name.";
    if (!formData.email.trim()) next.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!formData.phone.trim()) next.phone = "Please enter your phone number.";
    if (!formData.company.trim()) next.company = "Please enter your business name.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    setFormError("");

    try {
      await submitWebsiteEnquiry(formData);
      setErrors({});
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollReveal className="contact-section">
      <div className="contact-container">
        <h2 className="contact-title">
          Get Started
        </h2>

        <p className="contact-subtitle">
          {submitted
            ? "Thank you for getting in touch!"
            : "Get pricing specific to your business."}
        </p>

        {submitted ? (
          <div className="contact-success" role="status">
            <p>
              Your request has been submitted successfully, and our support team will contact you as soon as possible.
            </p>
            <p>
              If you need to contact us, please email us at{" "}
              <a href="mailto:support@cedarpayroll.com" className="highlight-red">
                support@cedarpayroll.com
              </a>
            </p>
          </div>
        ) : (
        <form
          className="contact-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="contact-row">
            <div className="contact-field">
              <input
                type="text"
                name="firstname"
                placeholder="Full Name"
                value={formData.firstname}
                onChange={handleChange}
                className={errors.firstname ? "has-error" : ""}
                aria-invalid={Boolean(errors.firstname)}
              />
              {errors.firstname ? (
                <p className="contact-field-error" role="alert">{errors.firstname}</p>
              ) : null}
            </div>

            <div className="contact-field">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "has-error" : ""}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? (
                <p className="contact-field-error" role="alert">{errors.email}</p>
              ) : null}
            </div>
          </div>

          <div className="contact-row">
            <div className="contact-field">
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? "has-error" : ""}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone ? (
                <p className="contact-field-error" role="alert">{errors.phone}</p>
              ) : null}
            </div>

            <div className="contact-field">
              <input
                type="text"
                name="company"
                placeholder="Business Name"
                value={formData.company}
                onChange={handleChange}
                className={errors.company ? "has-error" : ""}
                aria-invalid={Boolean(errors.company)}
              />
              {errors.company ? (
                <p className="contact-field-error" role="alert">{errors.company}</p>
              ) : null}
            </div>
          </div>

          <div className="contact-row">
            <input
              type="number"
              name="employees"
              placeholder="Number of Employees"
              value={formData.employees}
              onChange={handleChange}
            />

            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
            >
              <option>United States</option>
              <option>United Kingdom</option>
              <option>UAE</option>
              <option>Lebanon</option>

              <option>Afghanistan</option>
              <option>Albania</option>
              <option>Algeria</option>
              <option>Andorra</option>
              <option>Angola</option>
              <option>Argentina</option>
              <option>Armenia</option>
              <option>Australia</option>
              <option>Austria</option>
              <option>Azerbaijan</option>
              <option>Bahrain</option>
              <option>Bangladesh</option>
              <option>Belarus</option>
              <option>Belgium</option>
              <option>Belize</option>
              <option>Benin</option>
              <option>Bhutan</option>
              <option>Bolivia</option>
              <option>Bosnia and Herzegovina</option>
              <option>Botswana</option>
              <option>Brazil</option>
              <option>Brunei</option>
              <option>Bulgaria</option>
              <option>Burkina Faso</option>
              <option>Burundi</option>
              <option>Cambodia</option>
              <option>Cameroon</option>
              <option>Canada</option>
              <option>Chile</option>
              <option>China</option>
              <option>Colombia</option>
              <option>Costa Rica</option>
              <option>Croatia</option>
              <option>Cyprus</option>
              <option>Czech Republic</option>
              <option>Denmark</option>
              <option>Egypt</option>
              <option>Estonia</option>
              <option>Ethiopia</option>
              <option>Finland</option>
              <option>France</option>
              <option>Georgia</option>
              <option>Germany</option>
              <option>Ghana</option>
              <option>Greece</option>
              <option>Hungary</option>
              <option>Iceland</option>
              <option>India</option>
              <option>Indonesia</option>
              <option>Iran</option>
              <option>Iraq</option>
              <option>Ireland</option>
              <option>Israel</option>
              <option>Italy</option>
              <option>Japan</option>
              <option>Jordan</option>
              <option>Kazakhstan</option>
              <option>Kenya</option>
              <option>Kuwait</option>
              <option>Latvia</option>
              <option>Libya</option>
              <option>Lithuania</option>
              <option>Luxembourg</option>
              <option>Malaysia</option>
              <option>Maldives</option>
              <option>Malta</option>
              <option>Mexico</option>
              <option>Monaco</option>
              <option>Mongolia</option>
              <option>Morocco</option>
              <option>Myanmar</option>
              <option>Nepal</option>
              <option>Netherlands</option>
              <option>New Zealand</option>
              <option>Nigeria</option>
              <option>Norway</option>
              <option>Oman</option>
              <option>Pakistan</option>
              <option>Philippines</option>
              <option>Poland</option>
              <option>Portugal</option>
              <option>Qatar</option>
              <option>Romania</option>
              <option>Russia</option>
              <option>Saudi Arabia</option>
              <option>Singapore</option>
              <option>Slovakia</option>
              <option>Slovenia</option>
              <option>South Africa</option>
              <option>South Korea</option>
              <option>Spain</option>
              <option>Sri Lanka</option>
              <option>Sweden</option>
              <option>Switzerland</option>
              <option>Syria</option>
              <option>Taiwan</option>
              <option>Thailand</option>
              <option>Tunisia</option>
              <option>Turkey</option>
              <option>Uganda</option>
              <option>Ukraine</option>
              <option>Uruguay</option>
              <option>Uzbekistan</option>
              <option>Venezuela</option>
              <option>Vietnam</option>
              <option>Yemen</option>
              <option>Zambia</option>
              <option>Zimbabwe</option>
            </select>
          </div>

          <textarea
            name="needs"
            className="contact-needs"
            placeholder="Tell us about your payroll needs..."
            value={formData.needs}
            onChange={handleChange}
            rows={5}
          />

          <p className="privacy-line">
            By clicking Contact Us, you acknowledge
            that you have read our{" "}
            <Link
              to="/privacy"
              className="highlight-red"
            >
              <strong>Privacy Statement</strong>
            </Link>{" "}
            and agree to our{" "}
            <Link
              to="/terms"
              className="highlight-red"
            >
              <strong>Terms of Use</strong>
            </Link>
            .
          </p>

          {formError ? (
            <p className="contact-form-error" role="alert">{formError}</p>
          ) : null}

          <button
            type="submit"
            className="contact-btn"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Contact Us"}
          </button>
        </form>
        )}
      </div>
    </ScrollReveal>
  );
};

export default ContactSection;