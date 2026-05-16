# Requirements Document

## 1. Application Overview

**Application Name**: KWAME WEREKO ENTERPRISE E-Commerce Platform

**Application Description**: A modern, mobile-responsive e-commerce website for KWAME WEREKO ENTERPRISE, a leading FMCG distributor in Ghana. The platform enables customers to browse and purchase FMCG products online, supports multiple payment methods (PayStack integration with card, bank transfer, MTN MoMo), and features a unique Gift Box section for curated and customizable gift packages. The website includes a comprehensive admin portal for managing products, orders, customers, promotions, and analytics. Domain: werekoenterprise.com. Company contact: (+233) 26 479 3861, Accra, Ghana.

## 2. Target Users and Usage Scenarios

**Target Users**:
- End customers in Ghana seeking to purchase FMCG products online
- Website administrators managing inventory, orders, customers, and promotions

**Core Usage Scenarios**:
- Customers browse product catalog, add items to cart, complete checkout with PayStack payment
- Customers create custom gift boxes or purchase admin-curated gift boxes
- Admins manage product inventory, process orders, view analytics, and run promotions
- Customers track order status and view order history

## 3. Page Structure and Functional Description

### 3.1 Page Structure

```
Public Website
├── Home Page
├── Product Catalog Page
├── Product Detail Page
├── Shopping Cart Page
├── Checkout Page
├── Gift Box Section
│   ├── Admin-Curated Gift Boxes Page
│   └── User-Customizable Gift Box Builder Page
├── User Registration Page
├── User Login Page
├── User Account Page
│   ├── Order History
│   ├── Order Tracking
│   └── Wishlist
└── Footer (Contact Info, Social Links, Newsletter Signup)

Admin Portal
├── Admin Login Page
├── Dashboard Page
├── Product Management Page
├── Order Management Page
├── Customer Management Page
├── Promotions Management Page
├── Gift Box Management Page
├── Content Management Page
└── SEO Settings Page
```

### 3.2 Public Website Pages

#### 3.2.1 Home Page
- Display hero section with promotional banners and sliders
- Show featured product categories
- Highlight Gift Box section prominently
- Provide navigation to product catalog, gift boxes, user account
- Display footer with company info (KW Enterprise, (+233) 26 479 3861, Accra, Ghana), social links, newsletter signup

#### 3.2.2 Product Catalog Page
- Display product list with images, names, prices, stock status
- Provide category filtering (beverages, food, household, personal care, etc.)
- Support search functionality by product name or keyword
- Enable sorting by price, popularity, newest
- Show pagination for large product sets

#### 3.2.3 Product Detail Page
- Display product images, description, price, stock status
- Show product category and related products
- Provide \"Add to Cart\" and \"Add to Wishlist\" buttons
- Display product availability information

#### 3.2.4 Shopping Cart Page
- List all items added to cart with images, names, quantities, prices
- Allow quantity adjustment and item removal
- Display subtotal, estimated total
- Provide \"Proceed to Checkout\" button

#### 3.2.5 Checkout Page
- Collect shipping information (name, phone, address)
- Display order summary with item list and total amount
- Provide payment method selection (card, bank transfer, MTN MoMo via PayStack)
- Process payment through PayStack Inline JS popup
- Backend verifies transaction via PayStack API after payment completion
- Send order confirmation via SMS using cSMS API (https://app.mycsms.com/api/v3/sms/send) with CSMS_API_KEY
- Send order confirmation via email using Nodemailer with Gmail SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) with HTML email templates
- Redirect to order confirmation page with order tracking number

#### 3.2.6 Gift Box Section

**Admin-Curated Gift Boxes Page**:
- Display list of published gift boxes curated by admin
- Show gift box image, name, description, price, items included
- Display promotional discounts and applicable coupon codes
- Provide \"Add to Cart\" button for each gift box
- Support filtering and sorting of gift boxes

**User-Customizable Gift Box Builder Page**:
- Allow users to select products/items to include in custom gift box
- Provide packaging/wrapping style selection options
- Enable users to add personal message
- Display real-time price calculation based on selected items and packaging
- Provide \"Add to Cart\" button to proceed to checkout
- Show preview of custom gift box before adding to cart

#### 3.2.7 User Registration Page
- Collect user information (email or phone, password, name)
- Validate input fields
- Create user account via backend API endpoint
- Redirect to login page or user account page

#### 3.2.8 User Login Page
- Accept email or phone and password
- Authenticate user credentials via backend API endpoint
- Receive JWT token upon successful authentication
- Redirect to user account page or previous page after successful login

#### 3.2.9 User Account Page

**Order History**:
- Display list of past orders with order number, date, total amount, status
- Provide link to view order details

**Order Tracking**:
- Allow users to enter order tracking number
- Display current order status and delivery information

**Wishlist**:
- Show list of products added to wishlist
- Provide \"Add to Cart\" and \"Remove from Wishlist\" buttons

### 3.3 Admin Portal Pages

#### 3.3.1 Admin Login Page
- Accept admin credentials (email, password)
- Authenticate admin user with role-based access control via backend API endpoint
- Receive JWT token upon successful authentication
- Redirect to admin dashboard after successful login

#### 3.3.2 Dashboard Page
- Display analytics overview: total sales, total orders, total revenue, total customers
- Show charts for sales trends, order status distribution, top-selling products
- Provide quick links to key admin functions

#### 3.3.3 Product Management Page
- List all products with name, category, price, stock status
- Provide \"Add New Product\" button to create new product entry
- Allow editing of product details (name, description, price, category, images, stock quantity)
- Support product image uploads via backend API endpoint with multer middleware, stored locally
- Enable deletion of products
- Support bulk import/export of product data
- Manage product categories (add, edit, delete)

#### 3.3.4 Order Management Page
- Display list of all orders with order number, customer name, date, total amount, status
- Allow filtering by order status (pending, processing, shipped, delivered, cancelled)
- Provide order detail view with item list, customer info, shipping address, payment status
- Enable order status updates (mark as processing, shipped, delivered)
- Support order cancellation and refund processing

#### 3.3.5 Customer Management Page
- List all registered customers with name, email, phone, registration date
- Provide customer detail view with order history and total spending
- Allow viewing of individual customer order history

#### 3.3.6 Promotions Management Page
- Create discount codes with code name, discount percentage or fixed amount, validity period
- Create coupon codes applicable to specific products or categories
- Manage active and expired promotions
- Enable/disable promotions

#### 3.3.7 Gift Box Management Page
- Create admin-curated gift boxes with name, description, image, price, items included
- Set promotional discounts and coupon codes for gift boxes
- Publish or unpublish gift boxes to control visibility on website
- View list of all gift box orders (both admin-curated and user-customized)
- Track gift box order status separately from regular e-commerce orders

#### 3.3.8 Content Management Page
- Manage homepage banners and promotional sliders (upload images, set links, display order)
- Create and edit announcements for website
- Update company information and contact details

#### 3.3.9 SEO Settings Page
- Configure meta tags (title, description, keywords) for key pages
- Manage Open Graph tags for social media sharing
- Generate and update sitemap
- Configure PWA manifest settings

## 4. Business Rules and Logic

### 4.1 User Authentication and Authorization
- Public users can browse products and gift boxes without login
- Login required for checkout, order tracking, wishlist, order history
- JWT-based authentication for both public users and admin users
- Admin users have separate login with role-based access to admin portal
- Admin users cannot access public user accounts
- JWT tokens issued by backend API upon successful login

### 4.2 Product Inventory Management
- Product stock quantity decreases when order is placed
- Products with zero stock display \"Out of Stock\" status
- Out-of-stock products cannot be added to cart

### 4.3 Shopping Cart and Checkout
- Cart items persist for logged-in users across sessions via backend database storage
- Cart total recalculates when quantities change or items are removed
- Discount codes and coupon codes apply at checkout, reducing total amount
- Payment processed through PayStack Inline JS popup on frontend
- Backend verifies PayStack transaction via PayStack API after payment completion
- Order confirmation sent via SMS using cSMS API (https://app.mycsms.com/api/v3/sms/send) with CSMS_API_KEY
- Order confirmation sent via email using Nodemailer with Gmail SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) with HTML email templates

### 4.4 Gift Box Business Rules
- Admin-curated gift boxes are published by admin and displayed on website
- User-customizable gift boxes allow users to select items, packaging, and add personal message
- Gift box orders are tracked separately in admin portal
- Promotional discounts and coupon codes can be applied to gift boxes
- Gift box pricing includes selected items, packaging cost, and any applicable discounts

### 4.5 Order Processing Workflow
- New orders start with \"Pending\" status
- Admin updates status to \"Processing\" when order is being prepared
- Status changes to \"Shipped\" when order is dispatched
- Status changes to \"Delivered\" when customer receives order
- Orders can be cancelled by admin before shipping

### 4.6 Payment and Notification
- PayStack Inline JS handles payment processing for card, bank transfer, MTN MoMo on frontend
- Backend verifies transaction via PayStack API after payment completion
- Order confirmation with order number sent via SMS using cSMS API (https://app.mycsms.com/api/v3/sms/send) with CSMS_API_KEY
- Order confirmation with order number sent via email using Nodemailer with Gmail SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) with HTML email templates
- Payment failure redirects user to retry payment or cancel order

### 4.7 Data Storage
- Backend stores data in PostgreSQL database with tables: products, categories, orders, order_items, cart_items, promotions, gift_boxes, custom_gift_boxes, banners, profiles, site_settings, wishlists, order_notifications
- Product images uploaded via multer middleware and stored locally on server

### 4.8 SEO and PWA
- Meta tags, Open Graph tags, and sitemap configured for search engine optimization
- PWA manifest and service worker enable offline support and \"install app\" prompt on mobile/desktop

## 5. Exception and Boundary Conditions

| Scenario | Handling |
|----------|----------|
| User attempts to add out-of-stock product to cart | Display error message: \"Product is out of stock\" |
| Payment fails during checkout | Display error message, allow user to retry payment or cancel order |
| User enters invalid discount/coupon code | Display error message: \"Invalid or expired code\" |
| Admin attempts to delete product with active orders | Display warning, require confirmation before deletion |
| User forgets password | Provide password reset link via email or SMS |
| Admin updates order status to \"Shipped\" without tracking number | Display warning, prompt admin to add tracking number |
| User customizes gift box with no items selected | Display error message: \"Please select at least one item\" |
| Network error during PayStack payment | Display error message, allow user to retry or contact support |
| Admin publishes gift box without setting price | Display error message: \"Price is required\" |
| JWT token expires during session | Redirect user to login page with session expired message |
| Backend API endpoint returns error | Display user-friendly error message, log error details |
| cSMS API fails to send SMS | Log error, continue order processing, notify admin |
| Email sending fails via Nodemailer | Log error, continue order processing, notify admin |
| Product image upload exceeds size limit | Display error message with size limit information |

## 6. Acceptance Criteria

1. User visits homepage, browses product catalog, and views product details
2. User adds product to cart and proceeds to checkout
3. User completes registration or login via backend API endpoints
4. User enters shipping information and selects payment method
5. User completes payment via PayStack Inline JS popup, backend verifies transaction via PayStack API
6. User receives order confirmation via SMS using cSMS API and via email using Nodemailer with HTML template
7. Admin logs into admin portal via backend API endpoint and views dashboard analytics
8. Admin creates new product, uploads product image via multer middleware, sets price and stock quantity, and publishes product
9. Admin views order list, updates order status to \"Shipped\"
10. User tracks order status using order tracking number
11. Admin creates admin-curated gift box with items, price, and promotional discount, then publishes it
12. User visits Gift Box section, selects admin-curated gift box or builds custom gift box, adds to cart, and completes checkout

## 7. Out of Scope for This Release

- Multi-language support (only English supported)
- Advanced analytics and reporting (e.g., customer segmentation, predictive analytics)
- Integration with third-party logistics providers for automated shipping
- Live chat or customer support chatbot
- Product reviews and ratings by customers
- Loyalty points or rewards program
- Subscription-based product delivery
- Integration with accounting software beyond basic order data export
- Advanced inventory forecasting and automated reordering
- Multi-vendor marketplace functionality
- Social media login (e.g., Facebook, Google login)
- Real-time inventory synchronization with physical store systems
- Advanced gift box customization (e.g., custom packaging design upload)
- Affiliate marketing or referral program
- Cloud storage for product images (images stored locally on server)
- Advanced email template customization beyond HTML templates
- SMS delivery status tracking beyond cSMS API response
- Payment gateway alternatives beyond PayStack
- Database migration tools or version control for schema changes