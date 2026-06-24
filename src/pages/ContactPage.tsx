import { useEffect, useState } from 'react';
import { getCmsPage } from '@/services/store';
import { api } from '@/lib/api';
import Seo from '@/components/common/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Phone, Mail, MapPin, Clock, Send, Loader2, CheckCircle2,
  Facebook, Instagram, Twitter, MessageSquare,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ContactContent {
  hero?: { heading?: string; subheading?: string };
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  map_embed?: string;
  social?: { facebook?: string; instagram?: string; twitter?: string; whatsapp?: string };
}

// ── Static fallback ───────────────────────────────────────────────────────────
const STATIC: ContactContent = {
  hero: {
    heading: "We'd Love to Hear from You",
    subheading: 'Whether you have a question about an order, want to discuss a corporate gift programme, or just want to say hello — our team is here for you.',
  },
  address: 'East Legon, Accra, Greater Accra Region, Ghana',
  phone: '+233 26 479 3861',
  email: 'info@werekoenterprise.com',
  hours: 'Mon – Fri: 8am – 6pm | Sat: 9am – 4pm | Sun: Closed',
  map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.6!2d-0.15!3d5.63!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMzcnNDgiLjAiTiAwwrAwOScwMC4wIlc!5e0!3m2!1sen!2sgh!4v1620000000000!5m2!1sen!2sgh',
  social: {
    facebook: 'https://facebook.com/kwenterprise',
    instagram: 'https://instagram.com/kwenterprise',
    twitter: 'https://twitter.com/kwenterprise',
    whatsapp: 'https://wa.me/233264793861',
  },
};

const SUBJECTS = [
  'General Enquiry',
  'Order Support',
  'Corporate Gifting',
  'Custom Gift Box',
  'Delivery Issue',
  'Returns & Refunds',
  'Wholesale / Bulk Order',
  'Other',
];

// ══════════════════════════════════════════════════════════════════════════════
export default function ContactPage() {
  const [content, setContent] = useState<ContactContent>(STATIC);
  const [cmsLoading, setCmsLoading] = useState(true);

  // Form state
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [nextAllowed, setNextAllowed] = useState<Date | null>(null);

  // ── Check localStorage cooldown on mount ──────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('kw_contact_sent_at');
    if (stored) {
      const sentAt = new Date(stored);
      const allowed = new Date(sentAt.getTime() + 36 * 60 * 60 * 1000);
      if (new Date() < allowed) {
        setRateLimited(true);
        setNextAllowed(allowed);
      } else {
        localStorage.removeItem('kw_contact_sent_at');
      }
    }
  }, []);

  useEffect(() => {
    getCmsPage('contact').then(page => {
      if (page?.content) {
        const c = page.content as ContactContent;
        setContent({ ...STATIC, ...c, hero: { ...STATIC.hero, ...c.hero }, social: { ...STATIC.social, ...c.social } });
      }
      setCmsLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimited) return;
    setSending(true);
    try {
      await api.post('/api/settings/contact-message', { name, email, phone, subject, message });
      // Store send timestamp in localStorage for client-side guard
      localStorage.setItem('kw_contact_sent_at', new Date().toISOString());
      setSent(true);
      toast.success('Message sent! We\'ll get back to you within 24 hours.');
    } catch (err: unknown) {
      // Check for 429 rate-limit response
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg.includes('rate_limited') || errMsg.includes('429') || errMsg.includes('already sent')) {
        const allowed = new Date(Date.now() + 36 * 60 * 60 * 1000);
        setRateLimited(true);
        setNextAllowed(allowed);
        localStorage.setItem('kw_contact_sent_at', new Date().toISOString());
        toast.error('You already sent a message recently. Please wait 36 hours before sending again.');
      } else {
        // Graceful fallback: open mailto
        const mailto = `mailto:${content.email || STATIC.email}?subject=${encodeURIComponent(subject || 'Enquiry')}&body=${encodeURIComponent(`Name: ${name}\nPhone: ${phone}\n\n${message}`)}`;
        window.location.href = mailto;
        toast.success('Opening your email client…');
      }
    } finally {
      setSending(false);
    }
  };

  const c = content;

  return (
    <div className="pb-20">
      <Seo path="/contact" title="Contact Us — KW Enterprise" description="Get in touch with KW Enterprise for orders, wholesale enquiries and support." />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/20 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-900/30 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <span className="inline-block text-amber-200 text-sm font-medium uppercase tracking-widest mb-4 px-4 py-1 border border-amber-500/40 rounded-full">
            Get in Touch
          </span>
          {cmsLoading
            ? <Skeleton className="h-12 w-3/4 mx-auto mb-4 bg-amber-600/40" />
            : <h1 className="text-3xl md:text-5xl font-bold mb-4 text-balance max-w-2xl mx-auto">{c.hero?.heading}</h1>
          }
          <p className="text-amber-100 max-w-xl mx-auto text-pretty leading-relaxed">{c.hero?.subheading}</p>
        </div>
      </section>

      {/* ── Info cards ────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Phone,  label: 'Phone',   value: c.phone || STATIC.phone!,   href: `tel:${(c.phone || STATIC.phone)?.replace(/\s/g,'')}` },
            { icon: Mail,   label: 'Email',   value: c.email || STATIC.email!,   href: `mailto:${c.email || STATIC.email}` },
            { icon: MapPin, label: 'Address', value: c.address || STATIC.address!, href: `https://maps.google.com/?q=${encodeURIComponent(c.address || STATIC.address!)}` },
            { icon: Clock,  label: 'Hours',   value: c.hours || STATIC.hours!,   href: undefined },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-md p-5 flex gap-4 items-start h-full">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</p>
                {item.href
                  ? <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-800 hover:text-amber-600 transition-colors text-pretty break-words">{item.value}</a>
                  : <p className="text-sm text-gray-800 text-pretty">{item.value}</p>
                }
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact form + map ────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-10">

          {/* Form */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-balance">Send Us a Message</h2>
            <p className="text-gray-500 text-sm mb-7 text-pretty">Fill in the form below and we'll get back to you within 24 hours.</p>

            {rateLimited ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message Already Sent</h3>
                <p className="text-gray-500 text-sm max-w-sm text-pretty">
                  You already sent us a message recently. To prevent spam, we allow one message per 36 hours.
                  {nextAllowed && (
                    <> You can send another message after{' '}
                      <strong>{nextAllowed.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>.
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-400 mt-3">
                  Need urgent help? Email us directly at{' '}
                  <a href={`mailto:${c.email || STATIC.email}`} className="text-amber-600 hover:underline">
                    {c.email || STATIC.email}
                  </a>
                </p>
              </div>
            ) : sent ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500 text-sm max-w-sm text-pretty">
                  Thank you for reaching out. Our team will respond to your message within 24 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-name" className="text-sm font-normal">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="c-name" placeholder="Akosua Mensah" value={name} onChange={e => setName(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-email" className="text-sm font-normal">Email Address <span className="text-red-500">*</span></Label>
                    <Input id="c-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-11" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-phone" className="text-sm font-normal">Phone Number</Label>
                    <Input id="c-phone" type="tel" placeholder="+233 24 000 0000" value={phone} onChange={e => setPhone(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-normal">Subject <span className="text-red-500">*</span></Label>
                    <Select value={subject} onValueChange={setSubject} required>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-message" className="text-sm font-normal">Message <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="c-message"
                    placeholder="Tell us how we can help you…"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending || !subject}
                  className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                    : <><Send className="w-4 h-4 mr-2" />Send Message</>
                  }
                </Button>
              </form>
            )}
          </div>

          {/* Map + Social */}
          <div className="space-y-6">
            <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-100">
              <iframe
                src={c.map_embed || STATIC.map_embed}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="KW Enterprise Location"
              />
            </div>

            {/* WhatsApp CTA */}
            {c.social?.whatsapp && (
              <a
                href={c.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white rounded-xl px-5 py-4 transition-colors"
              >
                <MessageSquare className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Chat on WhatsApp</p>
                  <p className="text-xs text-green-100">Typically replies within minutes</p>
                </div>
              </a>
            )}

            {/* Social links */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Follow Us</p>
              <div className="flex gap-3">
                {c.social?.facebook && (
                  <a href={c.social.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-amber-100 flex items-center justify-center transition-colors">
                    <Facebook className="w-5 h-5 text-gray-600" />
                  </a>
                )}
                {c.social?.instagram && (
                  <a href={c.social.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-amber-100 flex items-center justify-center transition-colors">
                    <Instagram className="w-5 h-5 text-gray-600" />
                  </a>
                )}
                {c.social?.twitter && (
                  <a href={c.social.twitter} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-amber-100 flex items-center justify-center transition-colors">
                    <Twitter className="w-5 h-5 text-gray-600" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
