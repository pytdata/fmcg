export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  parent_id?: string | null;
  is_active?: boolean;
  product_count?: number;
  children?: Category[];
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DeliveryLocation {
  id: string;
  name: string;
  region?: string;
  delivery_fee: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface ProductMediaVariant {
  id: string;
  product_id: string;
  media_type: 'image' | 'video';
  url_original: string;
  url_large?: string;
  url_medium?: string;
  url_small?: string;
  url_video?: string;
  thumbnail_url?: string;
  duration_sec?: number;
  alt_text?: string;
  sort_order: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
}

export interface ProductVariationOption {
  id: string;
  type_id: string;
  value: string;
  price_modifier: number;
  stock_quantity: number;
  sku?: string;
  image_url?: string;
  sort_order: number;
}

export interface ProductVariationType {
  id: string;
  product_id: string;
  name: string;
  sort_order: number;
  options: ProductVariationOption[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compare_price?: number;
  stock_quantity: number;
  category_id?: string;
  images: string[];
  image_variants?: ProductMediaVariant[];
  videos?: ProductMediaVariant[];
  media?: ProductMediaVariant[];
  variations?: ProductVariationType[];
  sku?: string;
  weight_kg?: number;
  is_featured: boolean;
  is_active: boolean;
  category?: Category;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  meta_title?: string;
  meta_desc?: string;
  is_published: boolean;
  updated_at: string;
}

export interface GiftBox {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  price: number;
  compare_price?: number;
  items: { name: string; qty: number }[];
  packaging_style?: string;
  promotional_discount: number;
  coupon_code?: string;
  is_published: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface CustomGiftBox {
  id: string;
  user_id: string;
  name?: string;
  packaging_style: string;
  personal_message?: string;
  items: { product_id: string; name: string; price: number; qty: number; image_url?: string }[];
  total_price: number;
  status: 'draft' | 'ordered';
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_uses?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  applies_to: 'all' | 'products' | 'gift_boxes';
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link?: string;
  button_text?: string;
  sort_order: number;
  is_active: boolean;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  site_description?: string;
  contact_phone: string;
  contact_email?: string;
  contact_address: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  whatsapp_number?: string;
  delivery_fee: number;
  free_delivery_threshold: number;
  meta_title?: string;
  meta_description?: string;
}

export interface CartItem {
  id: string;
  user_id?: string;
  session_id?: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  payment_reference?: string;
  paystack_reference?: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  coupon_code?: string | null;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_region?: string;
  tracking_number?: string;
  notes?: string;
  order_type: 'regular' | 'gift_box';
  gift_box_id?: string | null;
  custom_gift_box_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  role: 'customer' | 'admin';
  avatar_url?: string;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
}

// ── New feature types ─────────────────────────────────────────────────────────
export interface SiteModule {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
  sort_order: number;
}

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  photo_url?: string;
  bio?: string;
  email?: string;
  linkedin_url?: string;
  twitter_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface SeoMeta {
  path: string;
  title?: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  og_image?: string;
  canonical_url?: string;
  h1?: string;
  focus_keyword?: string;
  noindex: boolean;
  score: number;
  updated_at?: string;
}

export interface SeoAuditCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail?: string;
  weight: number;
}

export interface SeoAuditResult {
  path: string;
  score: number;
  checks: SeoAuditCheck[];
}

export interface AnalyticsSummary {
  totals: { pageviews: number; visitors: number; events: number };
  series: { date: string; pageviews: number; visitors: number }[];
  top_pages: { path: string; views: number }[];
  referrers: { referrer: string; count: number }[];
  devices: { device: string; count: number }[];
}
