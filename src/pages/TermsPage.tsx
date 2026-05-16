import { useEffect, useState } from 'react';
import { getCmsPage } from '@/services/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TermsSection { title: string; content: string[] }
interface TermsContent {
  hero?: { heading?: string; subheading?: string };
  last_updated?: string;
  intro?: string;
  sections?: TermsSection[];
}

// ── Static fallback ───────────────────────────────────────────────────────────
const STATIC: TermsContent = {
  hero: { heading: 'Terms & Conditions', subheading: 'Please read these terms carefully before using our website or placing an order.' },
  last_updated: 'January 2025',
  intro: 'These Terms and Conditions govern your use of the KW Enterprise website and the purchase of products from our online store. By accessing our website or placing an order, you agree to be bound by these terms. If you do not agree, please do not use our services.',
  sections: [
    {
      title: '1. Definitions',
      content: [
        '"Company", "We", "Us" or "Our" refers to KW Enterprise, a business registered and operating in Ghana.',
        '"Customer", "You" or "Your" refers to the individual or entity placing an order or using our website.',
        '"Products" refers to all items listed for sale on our website, including FMCG goods and gift hampers.',
        '"Order" refers to any request placed by a Customer to purchase Products.',
        '"Website" refers to www.kwenterprise.com and all its sub-pages.',
      ],
    },
    {
      title: '2. Acceptance of Terms',
      content: [
        'By accessing or using our Website, you confirm that you are at least 18 years of age and have the legal capacity to enter into a binding contract.',
        'We reserve the right to update or modify these Terms at any time. Changes become effective immediately upon publication on the Website.',
        'Continued use of the Website after changes are posted constitutes your acceptance of the revised Terms.',
      ],
    },
    {
      title: '3. Orders and Pricing',
      content: [
        'All prices are displayed in Ghana Cedis (GHS) and are inclusive of applicable taxes unless stated otherwise.',
        'We reserve the right to change prices at any time without prior notice. The price applicable to your order is the price at the time of order placement.',
        'An order is confirmed only when you receive an order confirmation email from us. We reserve the right to cancel any order due to stock unavailability, pricing errors, or suspected fraudulent activity.',
        'Promotional prices and discount codes are subject to availability and may have expiry dates and specific conditions.',
      ],
    },
    {
      title: '4. Payment',
      content: [
        'We accept payment via Mobile Money (MTN MoMo, Vodafone Cash, AirtelTigo Money), debit/credit cards, and Cash on Delivery for selected areas.',
        'Payment must be completed in full before an order is dispatched, except for Cash on Delivery orders.',
        'We use secure payment processing provided by Paystack. We do not store your full card details.',
        'Cash on Delivery is available for orders within Accra and selected regions, subject to a minimum order value.',
      ],
    },
    {
      title: '5. Delivery and Shipping',
      content: [
        'We offer same-day delivery for orders placed before 2:00 PM within Accra. Orders placed after 2:00 PM will be delivered the next business day.',
        'Delivery to other regions in Ghana typically takes 1–5 business days depending on location.',
        'Delivery fees are calculated at checkout based on your delivery address and order weight.',
        'Orders above GHS 200 qualify for free delivery within Accra.',
        'We are not responsible for delays caused by circumstances beyond our control, including traffic, weather, or courier disruptions.',
        'Risk of loss or damage passes to you upon delivery of the Products.',
      ],
    },
    {
      title: '6. Returns and Refunds',
      content: [
        'We accept returns within 7 days of delivery for Products that are damaged, defective, or incorrectly supplied.',
        'Perishable goods (food items, fresh products) are not eligible for return unless they arrive in a damaged or spoiled condition.',
        'To initiate a return, contact us at info@werekoenterprise.com with your order number and photographs of the issue.',
        'Approved refunds will be processed within 5–10 business days to your original payment method.',
        'We do not offer refunds for change of mind or incorrect size/quantity orders where the product description was accurate.',
      ],
    },
    {
      title: '7. Intellectual Property',
      content: [
        'All content on this Website, including text, images, logos, product descriptions, and graphics, is the property of KW Enterprise or its content suppliers.',
        'You may not reproduce, distribute, or use any content from this Website without our prior written consent.',
        'Product images are for illustrative purposes and may vary slightly from the actual product received.',
      ],
    },
    {
      title: '8. Limitation of Liability',
      content: [
        'To the fullest extent permitted by law, KW Enterprise shall not be liable for any indirect, incidental, or consequential damages arising from your use of our Website or Products.',
        'Our total liability to you shall not exceed the total value of your most recent order.',
        'We make no warranties, express or implied, regarding the accuracy, completeness, or reliability of information on our Website.',
      ],
    },
    {
      title: '9. Privacy',
      content: [
        'Your use of our Website is also governed by our Privacy Policy, which is incorporated into these Terms by reference.',
        'Please review our Privacy Policy to understand our practices regarding the collection and use of your personal information.',
      ],
    },
    {
      title: '10. Governing Law',
      content: [
        'These Terms are governed by and construed in accordance with the laws of the Republic of Ghana.',
        'Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.',
        'If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.',
      ],
    },
    {
      title: '11. Contact',
      content: [
        'If you have any questions about these Terms and Conditions, please contact us at:',
        'Email: info@werekoenterprise.com',
        'Phone: +233 26 479 3861',
        'Address: East Legon, Accra, Ghana',
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
export default function TermsPage() {
  const [content, setContent] = useState<TermsContent>(STATIC);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCmsPage('terms').then(page => {
      if (page?.content) {
        const c = page.content as TermsContent;
        setContent({ ...STATIC, ...c, hero: { ...STATIC.hero, ...c.hero }, sections: c.sections?.length ? c.sections : STATIC.sections });
      }
      setLoading(false);
    });
  }, []);

  const c = content;

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{c.hero?.heading}</h1>
          <p className="text-gray-300 max-w-xl mx-auto text-pretty">{c.hero?.subheading}</p>
          {c.last_updated && <p className="text-gray-500 text-xs mt-3">Last updated: {c.last_updated}</p>}
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-14 max-w-3xl">
        {loading ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <>
            {c.intro && (
              <p className="text-gray-600 leading-relaxed text-pretty mb-10 p-5 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl">
                {c.intro}
              </p>
            )}
            <div className="space-y-9">
              {(c.sections ?? []).map((section, i) => (
                <div key={i}>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{section.title}</h2>
                  <ul className="space-y-2">
                    {section.content.map((para, pi) => (
                      <li key={pi} className="text-gray-600 leading-relaxed text-pretty text-sm flex gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                        <span>{para}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 text-center text-sm text-gray-500">
              <p>Have questions about our terms?{' '}
                <Link to="/contact" className="text-amber-600 hover:underline">Contact us</Link>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
