// Helpers for rendering external media links (Google Drive, Dropbox, direct URLs).
// Admins paste share links; these normalise them into something usable in <img>/<iframe>.

const DRIVE_FILE_RE = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/;
const DRIVE_OPEN_RE = /drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/;
const DRIVE_UC_RE = /drive\.google\.com\/uc\?(?:export=\w+&)?id=([A-Za-z0-9_-]+)/;

function driveId(url: string): string | null {
  for (const re of [DRIVE_FILE_RE, DRIVE_OPEN_RE, DRIVE_UC_RE]) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Resolve an image link (esp. Google Drive share links) into a directly-renderable URL. */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  const id = driveId(trimmed);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  // Dropbox: force direct content
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
  }
  return trimmed;
}

/** Resolve a video link into an embeddable iframe URL (Drive / YouTube / direct). */
export function resolveVideoEmbed(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  const id = driveId(trimmed);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  const yt = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return trimmed;
}

/** True when a link points at a video the browser should embed via iframe rather than <video>. */
export function isEmbedVideo(url?: string | null): boolean {
  if (!url) return false;
  return /drive\.google\.com|youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

// A neutral inline SVG placeholder (light grey) for missing product/category images.
export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#f3f4f6"/><g fill="#d1d5db"><circle cx="200" cy="170" r="46"/><path d="M120 300l50-64 36 40 44-54 70 78z"/></g></svg>`,
  );

// Curated dummy imagery per category theme (used when a category has no image).
// Matched by keyword against the category name/slug; falls back to a generic shelf.
const CATEGORY_IMAGE_RULES: { test: RegExp; url: string }[] = [
  { test: /baby|child|infant|wipe|panty/, url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80' },
  { test: /pet/, url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80' },
  { test: /feminine|sanitary/, url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80' },
  { test: /oral|tooth|mouth|dental/, url: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&q=80' },
  { test: /personal care|beauty|soap|bath|lotion|cream|deo|roll|shav|razor|perfume|hand ?wash/, url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80' },
  { test: /home care|clean|dish|floor|glass|toilet|bleach|detergent|softener|polish|abrasive|starch/, url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80' },
  { test: /air|fragrance|freshener|camphor|candle|furniture/, url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80' },
  { test: /pest|insect|repellent|coil/, url: 'https://images.unsplash.com/photo-1632173870530-5c5b8c2f2b8a?w=600&q=80' },
  { test: /stationery|office|pen|envelope|book|marker|adhesive/, url: 'https://images.unsplash.com/photo-1583485088034-697b5bc36b92?w=600&q=80' },
  { test: /health|hygiene|wellness|ointment|antiseptic|pharma/, url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80' },
  { test: /food|beverage|confection|candy|chocolate|gum|sugar|oil|vinegar/, url: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=600&q=80' },
  { test: /household|batter|lighter|tissue|peg|hanger/, url: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&q=80' },
];

const CATEGORY_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80';

/** Return a themed dummy image URL for a category based on its name/slug. */
export function categoryImage(nameOrSlug: string): string {
  const s = (nameOrSlug || '').toLowerCase();
  for (const rule of CATEGORY_IMAGE_RULES) if (rule.test.test(s)) return rule.url;
  return CATEGORY_FALLBACK_IMAGE;
}

