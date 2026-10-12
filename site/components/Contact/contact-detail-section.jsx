import { useState } from "react";
import { Link } from "react-router-dom";
import "./contact-detail-section.css";

const contacts = [
    {
        icon: "/assets/icons/phone.svg",
        title: "Phone",
        line1: "+971 50 429 4194",
        line2: "Mon–Fri, 9:00 AM – 5:00 PM",
    },
    {
        icon: "/assets/icons/email.svg",
        title: "Email",
        line1: "support@cedarpayroll.com",
        line2: "Response within 24 hours",
    },
    {
        icon: "/assets/icons/location.svg",
        title: "Offices",
        line1: "United Kingdom",
        line2: "UAE • Lebanon • USA • UK • KSA",
    },
    {
        icon: "/assets/icons/clock.svg",
        title: "Business Hours",
        line1: "Monday – Friday",
        line2: "9:00 AM – 5:00 PM",
    },
];

const ContactCardsSection = () => {
    return (
        <section className="contact-cards-section">
            <div className="contact-cards-container">
                <h2 className="contact-cards-heading subheading">
                    Contacts
                </h2>

                <div className="contact-cards-grid">
                    {contacts.map((item, index) => (
                        <div className="contact-card" key={index}>
                            <div className="contact-icon-circle">
                                <img
                                    src={item.icon}
                                    alt={item.title}
                                    className = "contact-icon"
                                />
                            </div>
<p className="contact-card-line1 number">
                                {item.title}
                            </p>
                            <p className="contact-card-line1 lighttext">
                                {item.line1}
                            </p>

                            <p className="contact-card-line2 lighttext">
                                {item.line2}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ContactCardsSection;