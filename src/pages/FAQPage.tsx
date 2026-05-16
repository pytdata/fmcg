import { useEffect, useState } from 'react';
import { getCmsPage } from '@/services/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FAQItem { question: string; answer: string }
interface FAQCategory { category: string; icon?: string; items: FAQItem[] }
interface FAQContent {
  hero?: { heading?: string; subheading?: string };
  categories?: FAQCategory[];
}

// ── Static fallback ───────────────────────────────────────────────────────────
const STATIC: FAQContent = {
  hero: {
    heading: 'Frequently Asked Questions',
    subheading: 'Find quick answers to the most common questions about orders, delivery, returns, and more.',
  },
  categories: [
    {
      category: 'Orders & Shopping',
      items: [
        {
          question: 'How do I place an order?',
          answer: 'Browse our shop, add items to your cart, and proceed to checkout. You can pay via Mobile Money, card, or Cash on Delivery. You\'ll receive an order confirmation email once your payment is processed.',
        },
        {
          question: 'Can I change or cancel my order after placing it?',
          answer: 'Orders can be modified or cancelled within 1 hour of placement. After that, your order enters processing and changes may not be possible. Contact us immediately at +233 26 479 3861 or info@werekoenterprise.com if you need to make changes.',
        },
        {
          question: 'Can I order without creating an account?',
          answer: 'Currently, an account is required to place an order. This helps us track your order history and provides a better shopping experience. Creating an account is free and takes less than a minute.',
        },
        {
          question: 'Are the product images accurate?',
          answer: 'We do our best to show accurate product images. However, colours and sizes may vary slightly due to screen settings and product batches. Detailed descriptions are provided for every item.',
        },
        {
          question: 'How do I use a coupon code?',
          answer: 'Enter your coupon code in the "Coupon Code" field at checkout before completing your payment. The discount will be applied automatically to your order total.',
        },
      ],
    },
    {
      category: 'Delivery & Shipping',
      items: [
        {
          question: 'What are your delivery areas?',
          answer: 'We deliver across Ghana. Same-day delivery is available within Accra for orders placed before 2:00 PM. Deliveries to other regions typically take 1–5 business days.',
        },
        {
          question: 'How much does delivery cost?',
          answer: 'Delivery fees are calculated at checkout based on your location and order size. Orders above GHS 200 qualify for free delivery within Accra.',
        },
        {
          question: 'How can I track my order?',
          answer: 'Once your order is dispatched, you\'ll receive a tracking notification via SMS and email. You can also visit "My Orders" in your account to check the latest status.',
        },
        {
          question: 'What happens if I\'m not available at delivery time?',
          answer: 'Our delivery team will call you before arriving. If you\'re unavailable, we\'ll attempt delivery again the next business day. After two failed attempts, you may need to arrange a collection.',
        },
        {
          question: 'Do you offer international shipping?',
          answer: 'Currently, we only deliver within Ghana. We are working on expanding our delivery network and hope to offer international shipping in the future.',
        },
      ],
    },
    {
      category: 'Gift Hampers & Custom Orders',
      items: [
        {
          question: 'Can I build a custom gift hamper?',
          answer: 'Absolutely! Visit our "Build Your Gift Box" page to select individual items, choose your packaging, add a personalised message, and create a truly unique gift. There is a minimum spend of GHS 50 for custom hampers.',
        },
        {
          question: 'Can I order gift hampers in bulk for corporate events?',
          answer: 'Yes! We specialise in corporate gifting. Contact us directly for bulk orders of 10 or more units. We offer volume discounts, branded packaging, and dedicated account management. Email info@werekoenterprise.com or call +233 26 479 3861.',
        },
        {
          question: 'Can I include a personalised gift card?',
          answer: 'Yes. During checkout, you can add a personalised message that will be printed on a gift card and included in your hamper at no extra charge.',
        },
        {
          question: 'How far in advance should I order for events?',
          answer: 'We recommend ordering at least 3–5 business days in advance for custom orders, and 7–10 business days for large corporate orders to ensure we can source and package everything perfectly.',
        },
      ],
    },
    {
      category: 'Payments',
      items: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept MTN Mobile Money, Vodafone Cash, AirtelTigo Money, debit and credit cards (Visa, Mastercard), and Cash on Delivery for qualifying orders within Accra.',
        },
        {
          question: 'Is it safe to pay on your website?',
          answer: 'Yes. All online payments are processed through Paystack, a PCI-DSS compliant payment processor. Your card details are encrypted and we never store your full payment information on our servers.',
        },
        {
          question: 'When will my card be charged?',
          answer: 'Your card or Mobile Money account is charged immediately when you complete checkout. For Cash on Delivery orders, payment is collected upon delivery.',
        },
        {
          question: 'Can I pay in instalments?',
          answer: 'Currently, we do not offer instalment payment plans. Full payment is required at checkout for all online orders.',
        },
      ],
    },
    {
      category: 'Returns & Refunds',
      items: [
        {
          question: 'What is your return policy?',
          answer: 'We accept returns within 7 days of delivery for products that are damaged, defective, or incorrectly supplied. Perishable goods (food and fresh items) cannot be returned unless they arrived in a damaged or spoiled condition.',
        },
        {
          question: 'How do I request a refund?',
          answer: 'Email info@werekoenterprise.com with your order number and clear photographs of the damaged or incorrect item within 7 days of receiving your order. Our team will review your request within 2 business days.',
        },
        {
          question: 'How long does a refund take?',
          answer: 'Approved refunds are processed within 5–10 business days to your original payment method. Mobile Money refunds are typically faster than card refunds.',
        },
        {
          question: 'Can I exchange an item instead of getting a refund?',
          answer: 'Yes, exchanges are available for the same item in a different variant (e.g., different size or flavour), subject to availability. Contact us to arrange an exchange.',
        },
      ],
    },
    {
      category: 'Account & Profile',
      items: [
        {
          question: 'How do I create an account?',
          answer: 'Click "Register" in the top navigation, enter your name, email, phone number, and a password. You\'ll receive a confirmation email to verify your account.',
        },
        {
          question: 'I forgot my password. How do I reset it?',
          answer: 'Click "Forgot Password" on the login page and enter your registered email address. We\'ll send you a password reset link. If you don\'t receive it, check your spam folder or contact support.',
        },
        {
          question: 'How do I update my delivery address?',
          answer: 'Log in to your account, go to "Profile", and update your delivery address details. New addresses can also be entered at checkout.',
        },
        {
          question: 'Can I have multiple delivery addresses?',
          answer: 'Currently, you can store one default delivery address in your profile. You can always enter a different delivery address at checkout without changing your saved address.',
        },
      ],
    },
  ],
};

// ── Accordion item ────────────────────────────────────────────────────────────
function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`border-b border-gray-100 last:border-0 transition-colors ${isOpen ? 'bg-amber-50/50' : ''}`}>
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 focus:outline-none"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-900 text-sm leading-relaxed">{item.question}</span>
        <span className="shrink-0 mt-0.5">
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-amber-600" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-600 leading-relaxed text-pretty">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FAQPage() {
  const [content, setContent] = useState<FAQContent>(STATIC);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getCmsPage('faq').then(page => {
      if (page?.content) {
        const c = page.content as FAQContent;
        setContent({ ...STATIC, ...c, hero: { ...STATIC.hero, ...c.hero }, categories: c.categories?.length ? c.categories : STATIC.categories });
      }
      setLoading(false);
    });
  }, []);

  const toggle = (key: string) => setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));

  const c = content;

  // Filter by search
  const filtered = (c.categories ?? []).map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  const totalResults = filtered.reduce((s, cat) => s + cat.items.length, 0);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/20 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-900/30 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-balance max-w-2xl mx-auto">{c.hero?.heading}</h1>
          <p className="text-amber-100 max-w-xl mx-auto text-pretty mb-8">{c.hero?.subheading}</p>
          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-12 bg-white text-gray-900 border-0 shadow-lg focus-visible:ring-amber-500"
            />
          </div>
          {search && (
            <p className="text-amber-200 text-sm mt-3">
              {totalResults > 0 ? `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${search}"` : `No results for "${search}"`}
            </p>
          )}
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="container mx-auto px-4 py-14 max-w-3xl">
        {loading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No results found</h3>
            <p className="text-gray-400 text-sm">Try a different search term or <Link to="/contact" className="text-amber-600 hover:underline">contact us directly</Link>.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat, ci) => (
              <div key={ci}>
                <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  {cat.category}
                  <span className="ml-auto text-xs text-gray-400 font-normal">{cat.items.length} question{cat.items.length !== 1 ? 's' : ''}</span>
                </h2>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {cat.items.map((item, ii) => {
                    const key = `${ci}-${ii}`;
                    return (
                      <AccordionItem
                        key={key}
                        item={item}
                        isOpen={!!openItems[key]}
                        onToggle={() => toggle(key)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Still need help */}
        <div className="mt-14 bg-amber-50 rounded-2xl border border-amber-100 p-8 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Still have a question?</h3>
          <p className="text-gray-500 text-sm mb-5 text-pretty max-w-sm mx-auto">
            Can't find what you're looking for? Our team is always happy to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="https://wa.me/233264793861"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
