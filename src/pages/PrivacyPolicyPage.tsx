import { useEffect, useState } from 'react';
import { getCmsPage } from '@/services/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PolicySection { title: string; content: string[] }
interface PrivacyContent {
  hero?: { heading?: string; subheading?: string };
  last_updated?: string;
  intro?: string;
  sections?: PolicySection[];
}

// ── Static fallback ───────────────────────────────────────────────────────────
const STATIC: PrivacyContent = {
  hero: { heading: 'Privacy Policy', subheading: 'Your privacy matters to us. Learn how we collect, use, and protect your personal information.' },
  last_updated: 'January 2025',
  intro: 'KW Enterprise ("we", "us", or "our") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and your rights in relation to that information when you visit our website or make a purchase from us.',
  sections: [
    {
      title: '1. Information We Collect',
      content: [
        'Personal identification information: Full name, email address, phone number, and delivery address when you create an account or place an order.',
        'Payment information: We collect payment details through our secure payment processor (Paystack). We do not store your full card number or PIN.',
        'Order history: Records of products purchased, order values, delivery details, and order status.',
        'Communication data: Messages you send us via email, WhatsApp, or our contact form.',
        'Usage data: IP address, browser type, pages visited, time spent on the site, and referral sources — collected automatically for analytics purposes.',
        'Cookie data: We use cookies and similar tracking technologies to enhance your browsing experience. See our Cookie section below.',
      ],
    },
    {
      title: '2. How We Use Your Information',
      content: [
        'To process and fulfil your orders, including payment processing and delivery coordination.',
        'To communicate with you about your orders, deliveries, and any issues that arise.',
        'To send marketing communications (where you have consented), including promotional offers, new products, and newsletters.',
        'To improve our website, products, and customer service based on usage data and feedback.',
        'To comply with legal and regulatory obligations.',
        'To detect and prevent fraud, abuse, and security incidents.',
      ],
    },
    {
      title: '3. Sharing Your Information',
      content: [
        'We do not sell, rent, or trade your personal information to third parties.',
        'We may share your information with trusted service providers who assist us in operating our business, including delivery companies, payment processors, and IT service providers — under strict confidentiality agreements.',
        'We may disclose your information to regulatory authorities or law enforcement agencies when required by law.',
        'In the event of a business merger, acquisition, or sale, your data may be transferred to the new owner, subject to the same privacy protections.',
      ],
    },
    {
      title: '4. Data Security',
      content: [
        'We implement appropriate technical and organisational security measures to protect your personal data against unauthorised access, loss, or disclosure.',
        'All data transmissions between your browser and our website are encrypted using SSL/TLS technology.',
        'Access to your personal data within our organisation is restricted to authorised personnel on a need-to-know basis.',
        'Despite our best efforts, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.',
      ],
    },
    {
      title: '5. Data Retention',
      content: [
        'We retain your personal information for as long as necessary to fulfil the purposes for which it was collected, including legal, accounting, or reporting requirements.',
        'Account data is retained for the duration of your account and for up to 3 years after account closure.',
        'Order data is retained for a minimum of 7 years to comply with Ghanaian tax and commercial regulations.',
        'Marketing data (where consent was given) is retained until you withdraw consent.',
      ],
    },
    {
      title: '6. Cookies',
      content: [
        'We use essential cookies to keep you logged in and maintain your shopping cart.',
        'We use analytics cookies (such as Google Analytics) to understand how visitors use our website. This data is aggregated and anonymised.',
        'We use functional cookies to remember your preferences (e.g., currency, language).',
        'You can control cookie settings in your browser. Disabling cookies may affect the functionality of our website.',
      ],
    },
    {
      title: '7. Your Rights',
      content: [
        'Right of access: You may request a copy of the personal information we hold about you.',
        'Right to correction: You may request that we correct inaccurate or incomplete personal information.',
        'Right to deletion: You may request that we delete your personal information, subject to legal retention requirements.',
        'Right to object: You may opt out of marketing communications at any time by clicking "Unsubscribe" in any email or contacting us directly.',
        'To exercise any of these rights, contact us at info@werekoenterprise.com.',
      ],
    },
    {
      title: '8. Third-Party Links',
      content: [
        'Our website may contain links to third-party websites. We are not responsible for the privacy practices of those websites.',
        'We encourage you to review the privacy policies of any third-party sites you visit.',
      ],
    },
    {
      title: '9. Children\'s Privacy',
      content: [
        'Our website is not directed at children under the age of 13.',
        'We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.',
      ],
    },
    {
      title: '10. Changes to This Policy',
      content: [
        'We may update this Privacy Policy from time to time. The updated version will be published on this page with a revised "Last Updated" date.',
        'We encourage you to review this policy periodically to stay informed about how we protect your information.',
      ],
    },
    {
      title: '11. Contact Us',
      content: [
        'If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:',
        'Email: info@werekoenterprise.com',
        'Phone: +233 26 479 3861',
        'Address: East Legon, Accra, Ghana',
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<PrivacyContent>(STATIC);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCmsPage('privacy').then(page => {
      if (page?.content) {
        const c = page.content as PrivacyContent;
        setContent({ ...STATIC, ...c, hero: { ...STATIC.hero, ...c.hero }, sections: c.sections?.length ? c.sections : STATIC.sections });
      }
      setLoading(false);
    });
  }, []);

  const c = content;

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-950 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-700 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{c.hero?.heading}</h1>
          <p className="text-blue-200 max-w-xl mx-auto text-pretty">{c.hero?.subheading}</p>
          {c.last_updated && <p className="text-blue-400 text-xs mt-3">Last updated: {c.last_updated}</p>}
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
              <p className="text-gray-600 leading-relaxed text-pretty mb-10 p-5 bg-blue-50 border-l-4 border-blue-400 rounded-r-xl">
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
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-2" />
                        <span>{para}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 text-center text-sm text-gray-500">
              <p>Questions about your privacy?{' '}
                <Link to="/contact" className="text-blue-600 hover:underline">Contact us</Link>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
