export default function PaystackTrustBanner({ compact = false }: { compact?: boolean }) {
  return <div className={`rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-950 ${compact ? 'w-full max-w-[220px] h-20' : ''}`}>
    <img src="/assets/paystack-banner.png" alt="Pay online securely with Paystack using card, bank or mobile money" className={`w-full h-full ${compact ? 'object-cover object-top' : 'object-cover'}`} loading="lazy" />
  </div>;
}
