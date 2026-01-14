import PricingBento from "@/components/PricingBento/PricingBento";
import SeoPricing from "@/components/SeoPricing/SeoPricing";
import EmailPricing from "@/components/EmailPricing/EmailPricing";


export default function PricePage() {
  return (
    <main>
      <h1>Pricing</h1>
      <p>Choose the plan that fits your needs.</p>
      <PricingBento />

     <div style={{ marginTop: 120 }}>
        <SeoPricing />
     </div>
     <div style={{ marginTop: 120 }}>
        <EmailPricing />
     </div>
     



      
    </main>
    
  );
}
