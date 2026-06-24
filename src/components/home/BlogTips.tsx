import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { getBlogPosts } from '@/services/store';
import { resolveImageUrl, IMAGE_PLACEHOLDER } from '@/lib/media';
import { Badge } from '@/components/ui/badge';
import type { BlogPost } from '@/types/index';

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BlogTips() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getBlogPosts().then(data => {
      if (active) { setPosts(Array.isArray(data) ? data : []); setLoaded(true); }
    });
    return () => { active = false; };
  }, []);

  if (loaded && posts.length === 0) return null;
  if (posts.length === 0) return null;

  const latest = posts.slice(0, 3);

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <span className="text-amber-600 text-sm font-medium uppercase tracking-widest">Blog &amp; Tips</span>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 text-balance">Latest from KW</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {latest.map(post => {
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
                <h3 className="font-semibold text-gray-900 mb-2 text-balance line-clamp-2 group-hover:text-amber-600 transition-colors">
                  {post.title}
                </h3>
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

      <div className="text-center mt-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
