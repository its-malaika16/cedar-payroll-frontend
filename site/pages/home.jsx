import Herosection from "../components/Home/home-hero-section";
import PayrollFeatures from '../components/Home/payroll-features-section';
import FeaturesGrid from '../components/Home/features-grid-section';
import PlatformSolutionsSection from "../components/Home/platform-solution-section";
import PayrollBankingSection from "../components/Home/platform-banking-section";
import WhyChooseSection from "../components/Home/why-choose-section";
import CTASection from "../components/Home/home-cta-section";

export default function home() {
  return (
    <>
    <Herosection/>
    {/* <PayrollFeatures /> */}
    <FeaturesGrid />
    <PlatformSolutionsSection />
    <PayrollBankingSection />
    <WhyChooseSection />
    <CTASection />

    </>
  );
}