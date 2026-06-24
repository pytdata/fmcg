import { useEffect, useState } from 'react';
import { getBrands } from '@/services/store';
import type { Brand } from '@/types/index';

export default function TrustedBrands({ fallbackNames = [] }: { fallbackNames?: string[] }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getBrands().then(data => { if (active) { setBrands(data); setLoaded(true); } });
    return () => { active = false; };
  }, []);

  // No admin-managed brands yet — fall back to plain CMS brand names if provided.
  if (loaded && brands.length === 0) {
    if (fallbackNames.length === 0) return null;
    return (
      <section className="bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-400 font-medium uppercase tracking-widest mb-6">
            Trusted Brands We Carry
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {fallbackNames.map((name, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-3 text-sm font-semibold text-gray-600">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-gray-400 font-medium uppercase tracking-widest mb-6">
          Trusted Brands We Carry
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {brands.map(b => {
            const card = b.logo_url ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-3 flex items-center justify-center">
                <img src={b.logo_url} alt={b.name} className="object-contain max-h-10" />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-3 text-sm font-semibold text-gray-600">
                {b.name}
              </div>
            );

            return b.website_url ? (
              <a key={b.id} href={b.website_url} target="_blank" rel="noopener noreferrer"
                className="transition-transform hover:-translate-y-0.5">
                {card}
              </a>
            ) : (
              <div key={b.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
