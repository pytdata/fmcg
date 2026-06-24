import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Newspaper } from 'lucide-react';
import { getBlogPosts } from '@/services/store';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Seo from '@/components/common/Seo';
import type { BlogPost } from '@/types/index';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBlogPosts().then(data => {
      if (active) { setPosts(Array.isArray(data) ? data : []); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo path="/blog" title="Blog & Tips — KW Enterprise" />

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-amber-100 text-xs font-semibold uppercase tracking-widest mb-2">Blog &amp; Tips</p>
          <h1 className="text-3xl md:text-4xl font-bold text-balance">Latest from KW</h1>
          <p className="text-amber-50 mt-3 max-w-xl mx-auto text-pretty">
            Gifting ideas, product tips and stories from the KW Enterprise team.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <Skeleton className="aspect-[16/9] w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-700">No posts yet</h2>
            <p className="text-sm text-gray-500 mt-1">Check back soon for tips and stories.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => {
              const date = formatDate(post.published_at ?? post.created_at);
              return (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5"
                >
                  <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                    <img
                      src={post.cover_image_url ? resolveImageUrl(post.cover_image_url) : IMAGE_PLACEHOLDER}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.category && (
                        <Badge className="bg-amber-50 text-amber-700 border-0">{post.category}</Badge>
                      )}
                      {post.read_time && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" /> {post.read_time}
                        </span>
                      )}
                    </div>
                    <h2 className="font-semibold text-gray-900 mb-2 text-balance line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-gray-500 leading-relaxed flex-1 text-pretty line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    {date && <p className="text-xs text-gray-400 mt-4">{date}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
