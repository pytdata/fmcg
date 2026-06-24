import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ModulesProvider } from '@/contexts/ModulesContext';
import Layout from '@/components/layout/Layout';
import AdminLayout from '@/components/layout/AdminLayout';
import AnalyticsTracker from '@/components/common/AnalyticsTracker';
import { Toaster } from '@/components/ui/sonner';

// Public pages
import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import GiftBoxesPage from '@/pages/GiftBoxesPage';
import GiftBoxDetailPage from '@/pages/GiftBoxDetailPage';
import CustomGiftBoxPage from '@/pages/CustomGiftBoxPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProfilePage from '@/pages/ProfilePage';
import OrdersPage from '@/pages/OrdersPage';
import OrderTrackingPage from '@/pages/OrderTrackingPage';
import WishlistPage from '@/pages/WishlistPage';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage';
import AboutPage from '@/pages/AboutPage';
import ServicesPage from '@/pages/ServicesPage';
import ContactPage from '@/pages/ContactPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import FAQPage from '@/pages/FAQPage';
import NotFound from '@/pages/NotFound';

// Admin pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminProductsPage from '@/pages/admin/AdminProductsPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminCustomersPage from '@/pages/admin/AdminCustomersPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminPromotionsPage from '@/pages/admin/AdminPromotionsPage';
import AdminGiftBoxesPage from '@/pages/admin/AdminGiftBoxesPage';
import AdminBannersPage from '@/pages/admin/AdminBannersPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminPagesPage from '@/pages/admin/AdminPagesPage';
import AdminPricingPage from '@/pages/admin/AdminPricingPage';
import AdminSetupPage from '@/pages/admin/AdminSetupPage';
import AdminDeliveryLocationsPage from '@/pages/admin/AdminDeliveryLocationsPage';
import AdminModulesPage from '@/pages/admin/AdminModulesPage';
import AdminBrandsPage from '@/pages/admin/AdminBrandsPage';
import AdminTeamPage from '@/pages/admin/AdminTeamPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminSeoPage from '@/pages/admin/AdminSeoPage';
import AdminGiftPackagingPage from '@/pages/admin/AdminGiftPackagingPage';
import AdminBlogPage from '@/pages/admin/AdminBlogPage';
import AdminNewsletterPage from '@/pages/admin/AdminNewsletterPage';
import BlogPage from '@/pages/BlogPage';
import BlogPostPage from '@/pages/BlogPostPage';

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ModulesProvider>
        <CartProvider>
          <AnalyticsTracker />
          <Routes>
            {/* Public Routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:categorySlug" element={<ShopPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/gift-boxes" element={<GiftBoxesPage />} />
              <Route path="/gift-boxes/:slug" element={<GiftBoxDetailPage />} />
              <Route path="/gift-boxes/custom" element={<CustomGiftBoxPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order-tracking" element={<OrderTrackingPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin Setup (no auth required) */}
            <Route path="/admin/setup" element={<AdminSetupPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="promotions" element={<AdminPromotionsPage />} />
              <Route path="gift-boxes" element={<AdminGiftBoxesPage />} />
              <Route path="banners" element={<AdminBannersPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="pages" element={<AdminPagesPage />} />
              <Route path="pricing" element={<AdminPricingPage />} />
              <Route path="delivery-locations" element={<AdminDeliveryLocationsPage />} />
              <Route path="modules" element={<AdminModulesPage />} />
              <Route path="brands" element={<AdminBrandsPage />} />
              <Route path="team" element={<AdminTeamPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="seo" element={<AdminSeoPage />} />
              <Route path="gift-packaging" element={<AdminGiftPackagingPage />} />
              <Route path="blog" element={<AdminBlogPage />} />
              <Route path="newsletter" element={<AdminNewsletterPage />} />
            </Route>
          </Routes>
          <Toaster />
        </CartProvider>
        </ModulesProvider>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
