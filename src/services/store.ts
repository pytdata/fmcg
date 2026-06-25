import { api } from '@/lib/api';
import { cachedGet } from '@/lib/api';
import type { Product, Category, Banner, GiftBox, Promotion, SiteSettings, Order, Brand, TeamMember, SeoMeta, GiftPackaging, BlogPost, Testimonial } from '@/types/index';

export async function getTestimonials(): Promise<Testimonial[]> {
  try { return await cachedGet<Testimonial[]>('/api/testimonials'); }
  catch { return []; }
}

export async function getGiftPackaging(): Promise<GiftPackaging[]> {
  try { return await cachedGet<GiftPackaging[]>('/api/gift-packaging'); }
  catch { return []; }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try { return await cachedGet<BlogPost[]>('/api/blog'); }
  catch { return []; }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try { return await api.get<BlogPost>(`/api/blog/${slug}`); }
  catch { return null; }
}

export async function getBrands(): Promise<Brand[]> {
  try { return await cachedGet<Brand[]>('/api/brands'); }
  catch { return []; }
}

export async function getTeam(): Promise<TeamMember[]> {
  try { return await cachedGet<TeamMember[]>('/api/team'); }
  catch { return []; }
}

export async function getSeoMeta(path: string): Promise<SeoMeta | null> {
  try { return await api.get<SeoMeta>(`/api/seo/meta?path=${encodeURIComponent(path)}`); }
  catch { return null; }
}

export async function getCategories(): Promise<Category[]> {
  try { return await cachedGet<Category[]>('/api/categories'); }
  catch { return []; }
}

// Admin: all categories including inactive ones.
export async function getAdminCategories(): Promise<Category[]> {
  try { return await api.get<Category[]>('/api/categories/admin/all'); }
  catch { return []; }
}

export async function getProducts(options?: {
  categorySlug?: string; featured?: boolean; search?: string; limit?: number;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (options?.categorySlug) params.set('category', options.categorySlug);
  if (options?.featured) params.set('featured', 'true');
  if (options?.search) params.set('search', options.search);
  if (options?.limit) params.set('limit', String(options.limit));
  try { return await api.get<Product[]>(`/api/products?${params}`); }
  catch { return []; }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try { return await api.get<Product>(`/api/products/${slug}`); }
  catch { return null; }
}

export async function getBanners(): Promise<Banner[]> {
  try { return await api.get<Banner[]>('/api/banners'); }
  catch { return []; }
}

export async function getGiftBoxes(): Promise<GiftBox[]> {
  try { return await api.get<GiftBox[]>('/api/gift-boxes'); }
  catch { return []; }
}

export async function getGiftBoxBySlug(slug: string): Promise<GiftBox | null> {
  try { return await api.get<GiftBox>(`/api/gift-boxes/${slug}`); }
  catch { return null; }
}

export async function getPromotions(): Promise<Promotion[]> {
  try { return await api.get<Promotion[]>('/api/promotions'); }
  catch { return []; }
}

export async function validateCoupon(
  code: string, subtotal: number,
): Promise<{ valid: boolean; discount: number; free_shipping?: boolean; message: string }> {
  try {
    return await api.post<{ valid: boolean; discount: number; free_shipping?: boolean; message: string }>(
      '/api/promotions/validate', { code, subtotal },
    );
  } catch {
    return { valid: false, discount: 0, message: 'Could not validate coupon.' };
  }
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try { return await api.get<SiteSettings>('/api/settings'); }
  catch { return null; }
}

export async function createOrder(order: Partial<Order> & { items: unknown[] }): Promise<Order | null> {
  try { return await api.post<Order>('/api/orders', order); }
  catch (err) { console.error('createOrder error', err); return null; }
}

export async function getOrders(userId?: string): Promise<Order[]> {
  try {
    if (userId) return await api.get<Order[]>('/api/orders/mine');
    return await api.get<Order[]>('/api/orders');
  } catch { return []; }
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  try { return await api.get<Order>(`/api/orders/track/${orderNumber}`); }
  catch { return null; }
}

// addOrderItems is now handled server-side inside POST /api/orders
export async function addOrderItems(_items: unknown[]) { /* no-op — handled by server */ }

export async function createCustomGiftBox(box: unknown): Promise<unknown | null> {
  try { return await api.post('/api/gift-boxes/custom', box); }
  catch (err) { console.error('createCustomGiftBox error', err); return null; }
}

export async function getCmsPage(slug: string): Promise<import('@/types/index').CmsPage | null> {
  try { return await api.get<import('@/types/index').CmsPage>(`/api/pages/${slug}`); }
  catch { return null; }
}

export async function getProductMedia(productId: string) {
  try { return await api.get<import('@/types/index').ProductMediaVariant[]>(`/api/products/${productId}/media`); }
  catch { return []; }
}

export async function getProductVariations(productId: string) {
  try { return await api.get<import('@/types/index').ProductVariationType[]>(`/api/products/${productId}/variations`); }
  catch { return []; }
}
