import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { getSeoMeta } from '@/services/store';
import type { SeoMeta } from '@/types/index';

interface SeoProps {
  /** Path key to load admin-managed SEO for. Defaults to current location pathname. */
  path?: string;
  /** Fallback title used until/if no admin SEO is configured. */
  title?: string;
  description?: string;
  image?: string;
}

/**
 * Injects on-page SEO tags. Admin-managed SEO meta (from /api/seo) takes
 * priority; falls back to the per-page defaults passed as props.
 */
export default function Seo({ path, title, description, image }: SeoProps) {
  const key = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const [meta, setMeta] = useState<SeoMeta | null>(null);

  useEffect(() => {
    let alive = true;
    getSeoMeta(key).then(m => { if (alive) setMeta(m); });
    return () => { alive = false; };
  }, [key]);

  const finalTitle = meta?.meta_title || meta?.title || title || 'KW Enterprise';
  const finalDesc = meta?.meta_description || description || '';
  const finalImage = meta?.og_image || image || '';
  const canonical = meta?.canonical_url || '';

  return (
    <Helmet>
      <title>{finalTitle}</title>
      {finalDesc && <meta name="description" content={finalDesc} />}
      {meta?.keywords && <meta name="keywords" content={meta.keywords} />}
      {meta?.noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={finalTitle} />
      {finalDesc && <meta property="og:description" content={finalDesc} />}
      {finalImage && <meta property="og:image" content={finalImage} />}
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content={finalImage ? 'summary_large_image' : 'summary'} />
    </Helmet>
  );
}
