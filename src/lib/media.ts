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
