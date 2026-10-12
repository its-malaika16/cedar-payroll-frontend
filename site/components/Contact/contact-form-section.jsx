import { useState } from "react";
import { Link } from "react-router-dom";
import "./contact-form-section.css";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    firstname: "",
    email: "",
    phone: "",
    company: "",
    employees: "",
    country: "United Kingdom",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);


    try {

      const response = await fetch(
        "https://cedarpayroll.co.uk/api/contact.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert("Form submitted successfully!");

        setFormData({
          firstname: "",
          email: "",
          phone: "",
          company: "",
          employees: "",
          country: "United Kingdom",
        });
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2 className="contact-title">
          Get Started
        </h2>

        <p className="contact-subtitle">
          Get pricing specific to your business.
        </p>

        <form
          className="contact-form"
          onSubmit={handleSubmit}
        >
          <div className="contact-row">
            <input
              type="text"
              name="firstname"
              placeholder="Full Name"
              value={formData.firstname}
              onChange={handleChange}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="contact-row">
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="company"
              placeholder="Business Name"
              value={formData.company}
              onChange={handleChange}
              required
            />
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
              required
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

          <button
            type="submit"
            className="contact-btn"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Contact Us"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactSection;