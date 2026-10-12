import "./terms-hero.css";

export default function TermsHero() {
    return (
        <section className="services-hero">

            {/* ✅ TOP TAG */}
            <div className="hero-tag">
                <span>● LEGAL</span>
            </div>

            {/* ✅ MAIN CARD */}
            <div className="hero-card">

                <h1>
                    Terms &<br />
                    <span>Conditions</span>
                </h1>

                {/* divider */}
                <div className="divider">
                    <span></span>
                    <span className="diamond"></span>
                    <span></span>
                </div>

                <p>
                   The terms governing your use of Cedar Capital Payroll's website and services.
                </p>

            </div>

            {/* ✅ BREADCRUMB */}
            <div className="breadcrumb">
                HOME <span>›</span> <span className="active">TERMS & CONDITIONS</span>
            </div>

        </section>
    );
}