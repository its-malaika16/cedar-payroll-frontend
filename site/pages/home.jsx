import Herosection from "../components/Home/home-hero-section";
import PlatformSolutionsSection from "../components/Home/platform-solution-section";
import PayrollBankingSection from "../components/Home/platform-banking-section";
import WhyChooseSection from "../components/Home/why-choose-section";
import CTASection from "../components/Home/home-cta-section";

export default function home() {
  return (
    <>
      <Herosection />
      <PlatformSolutionsSection />
      <PayrollBankingSection />
      <WhyChooseSection />
      <CTASection />
    </>
  );
}