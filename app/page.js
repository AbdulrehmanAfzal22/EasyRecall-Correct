import Image from "next/image";
import styles from "./page.module.css";
import Navbar from "./page/navbar/page";
import Hero from "./page/home/page";
import FeaturesSection from "./page/feature/page";
import HowItWorks from "./page/How-its-work/page";
import Pricing from "./page/dashboard/pricing/pricing";
import FAQ from "./page/faq/page";
import Footer from "./page/footer/page";
import AuthPage from "./page/signup/page";
// import DashboardLayout from "./page/dashboard/layout";

export default function Home() {
  return (

    <>
 {/* <AuthPage/> */}
       <Navbar />
      <Hero />

      <section id="features" className="features">
        <FeaturesSection />
      </section>

      <section id="how-it-works" className="features">
        <HowItWorks />
      </section>

   <section id="pricing" className="pricing">
        <Pricing />
      </section>

<section id="faq" className="faq">
        <FAQ />
      </section>
<section id="footer" className="footer">
        <Footer />
      </section> 
   
    </>
  );
}
