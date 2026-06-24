import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, User, Tag } from 'lucide-react';
import { getBlogPost } from '@/services/store';
import { resolveImageUrl } from '@/lib/media';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Seo from '@/components/common/Seo';
import type { BlogPost } from '@/types/index';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Render content safely as plain-text paragraphs (split on blank lines).
// This avoids any HTML injection / XSS — markup in `content` is shown verbatim.
function renderContent(content?: string) {
  if (!content) return null;
  const paragraphs = content
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
  return paragraphs.map((para, i) => (
    <p key={i} className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line text-pretty">
      {para}
    </p>
  ));
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!slug) { setLoading(false); return; }
    getBlogPost(slug).then(data => {
      if (active) { setPost(data); setLoading(false); }
    });
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Skeleton className="h-6 w-24 mb-6" />
        <Skeleton className="aspect-[16/9] w-full mb-6 rounded-xl" />
        <Skeleton className="h-9 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-xl">
        <Seo path="/blog" title="Post not found — KW Enterprise" />
        <h1 className="text-2xl font-bold text-gray-900">Post not found</h1>
        <p className="text-gray-500 mt-2">
          The article you're looking for doesn't exist or is no longer available.
        </p>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 mt-6 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  const date = formatDate(post.published_at ?? post.created_at);
  const cover = post.cover_image_url ? resolveImageUrl(post.cover_image_url) : '';

  return (
    <article className="container mx-auto px-4 py-10 max-w-3xl">
      <Seo
        path={`/blog/${post.slug}`}
        title={`${post.title} — KW Enterprise`}
        description={post.excerpt}
        image={cover || undefined}
      />

      <Link
        to="/blog"
        className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Blog
      </Link>

      {post.category && (
        <Badge className="bg-amber-50 text-amber-700 border-0 mb-3">{post.category}</Badge>
      )}

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-balance mb-4">{post.title}</h1>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 mb-6">
        {post.author && (
          <span className="inline-flex items-center gap-1.5">
            <User className="w-4 h-4" /> {post.author}
          </span>
        )}
        {date && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> {date}
          </span>
        )}
        {post.read_time && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {post.read_time}
          </span>
        )}
        {post.category && (
          <span className="inline-flex items-center gap-1.5">
            <Tag className="w-4 h-4" /> {post.category}
          </span>
        )}
      </div>

      {cover && (
        <div className="aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden mb-8">
          <img src={cover} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {post.excerpt && (
        <p className="text-lg text-gray-600 leading-relaxed mb-6 text-pretty">{post.excerpt}</p>
      )}

      <div className="prose max-w-none">{renderContent(post.content)}</div>
    </article>
  );
}
