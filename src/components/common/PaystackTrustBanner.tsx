export default function PaystackTrustBanner({ compact = false }: { compact?: boolean }) {
  return <div className={`rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 ${compact ? 'max-w-xl' : ''}`}>
    <img src="/assets/paystack-banner.png" alt="Pay online securely with Paystack using card, bank or mobile money" className="w-full h-auto object-cover" loading="lazy" />
  </div>;
}
