import FeatureHeroSection from "../components/Features/feature-hero-section";
import PayrollFeaturesDetails from "../components/Features/feature-detail-section";
import FeatureBenefitsSection from "../components/Features/feature-benefits-section";
import HowItWorksSection from "../components/Features/how-it-work-section";
import FeatureCTASection from "../components/Features/feature-cta-section";

export default function features() {
  return (
    <div className="features-page">
      <FeatureHeroSection />
      <PayrollFeaturesDetails />
      <FeatureBenefitsSection />
      <HowItWorksSection />
      <FeatureCTASection />
    </div>
  );
}
