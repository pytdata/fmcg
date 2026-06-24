// Built-in, self-contained inline-styled email body templates.
// `bodyHtml` is dropped into the `.body` section of buildEmailHtml() on the server,
// so it should NOT include <html>/<head>/<body> — just the inner content.
// Brand accent: amber (#b45309 / #92400e / #fffbeb).

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
}

const btn = (label: string, href = '#') =>
  `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="background:#b45309;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">${label}</a>
  </div>`;

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'newsletter',
    name: 'Newsletter / Announcement',
    description: 'General update or announcement to your subscriber list.',
    subject: 'This Month at KW Enterprise',
    preheader: "Here's what's new — fresh stock, tips and updates.",
    bodyHtml: `
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hello there,</p>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">We've got a few exciting updates to share with you this month. Here's a quick roundup of what's new and what you shouldn't miss.</p>
<h2 style="color:#92400e;font-size:18px;margin:24px 0 8px;">What's New</h2>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Replace this with your headline story — a new arrival, a restock, or a community update. Keep it short and friendly.</p>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:20px 0;">
  <p style="margin:0;color:#92400e;font-weight:600;">💡 Tip of the month</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;line-height:1.6;">Add a useful tip your customers will appreciate — e.g. how to store fresh produce or get the best value from bulk orders.</p>
</div>
${btn('Shop Now')}
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:16px 0 0;">Thanks for being part of the KW Enterprise family.</p>`,
  },
  {
    id: 'promotion',
    name: 'Promotion / Sale',
    description: 'Drive sales with a limited-time discount or offer.',
    subject: '🔥 Limited-Time Offer Just for You',
    preheader: 'Save big this week — offer ends soon!',
    bodyHtml: `
<div style="text-align:center;background:linear-gradient(135deg,#b45309 0%,#92400e 100%);border-radius:10px;padding:28px 20px;margin:0 0 24px;">
  <p style="margin:0;color:#fde68a;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Special Offer</p>
  <p style="margin:8px 0 0;color:#ffffff;font-size:34px;font-weight:800;">Save 20%</p>
  <p style="margin:6px 0 0;color:#fde68a;font-size:14px;">on your next order</p>
</div>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">For a limited time only, enjoy <strong>20% off</strong> across selected products. Stock up on your favourites before the offer ends.</p>
<div style="text-align:center;border:2px dashed #b45309;border-radius:8px;padding:14px;margin:20px 0;">
  <p style="margin:0;color:#92400e;font-size:13px;">Use code at checkout</p>
  <p style="margin:4px 0 0;color:#1f2937;font-size:24px;font-weight:800;letter-spacing:3px;">SAVE20</p>
</div>
${btn('Claim Your Discount')}
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:8px 0 0;text-align:center;">Offer valid while stocks last. Terms apply.</p>`,
  },
  {
    id: 'new-product',
    name: 'New Product',
    description: 'Introduce a new product or arrival to your audience.',
    subject: 'Just Arrived: Something New for You',
    preheader: 'Be the first to try our newest arrival.',
    bodyHtml: `
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">We're thrilled to introduce our newest arrival!</p>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:24px;margin:0 0 20px;text-align:center;">
  <p style="margin:0;font-size:40px;">📦</p>
  <h2 style="color:#92400e;font-size:20px;margin:12px 0 6px;">Product Name</h2>
  <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">A short, compelling description of what makes this product special and why your customers will love it.</p>
  <p style="margin:14px 0 0;color:#1f2937;font-size:22px;font-weight:800;">GHS 00.00</p>
</div>
<ul style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 16px;padding-left:20px;">
  <li>Key feature or benefit one</li>
  <li>Key feature or benefit two</li>
  <li>Key feature or benefit three</li>
</ul>
${btn('Shop the New Arrival')}`,
  },
  {
    id: 'welcome',
    name: 'Welcome',
    description: 'Greet new subscribers and set expectations.',
    subject: 'Welcome to KW Enterprise! 👋',
    preheader: "We're glad you're here — here's what to expect.",
    bodyHtml: `
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Hello and welcome! 🎉</p>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Thank you for joining the <strong>KW Enterprise</strong> community. You're now on the list for exclusive deals, new arrivals, and helpful updates delivered straight to your inbox.</p>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:20px 0;">
  <p style="margin:0 0 10px;color:#92400e;font-weight:600;">Here's what you can expect:</p>
  <p style="margin:0 0 6px;color:#374151;font-size:14px;">✅ Early access to promotions and sales</p>
  <p style="margin:0 0 6px;color:#374151;font-size:14px;">✅ First look at new products</p>
  <p style="margin:0;color:#374151;font-size:14px;">✅ Tips, news and community updates</p>
</div>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Ready to start shopping? Browse our full range of quality FMCG products.</p>
${btn('Start Shopping')}`,
  },
  {
    id: 'event-holiday',
    name: 'Event / Holiday',
    description: 'Celebrate a holiday or invite subscribers to an event.',
    subject: 'Celebrate the Season with KW Enterprise 🎊',
    preheader: 'Special wishes and offers for the season.',
    bodyHtml: `
<div style="text-align:center;margin:0 0 20px;">
  <p style="margin:0;font-size:44px;">🎉</p>
  <h2 style="color:#92400e;font-size:22px;margin:10px 0 0;">Happy Holidays!</h2>
</div>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">From all of us at <strong>KW Enterprise</strong>, we wish you and your loved ones a joyful and prosperous season.</p>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">To celebrate, we're sharing something special with our valued customers. Whether you're stocking up for gatherings or treating yourself, we've got you covered.</p>
<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:18px 20px;margin:20px 0;text-align:center;">
  <p style="margin:0;color:#92400e;font-weight:600;font-size:15px;">🎁 Festive offers now live</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;line-height:1.6;">Add your event details, opening hours, or seasonal discount here.</p>
</div>
${btn('Explore Seasonal Offers')}
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:16px 0 0;text-align:center;">Warm wishes, The KW Enterprise Team</p>`,
  },
];

export const BLANK_TEMPLATE: EmailTemplate = {
  id: 'blank',
  name: 'Blank',
  description: 'Start from scratch with an empty body.',
  subject: '',
  preheader: '',
  bodyHtml: '<p style="color:#374151;font-size:15px;line-height:1.6;">Start writing your email here…</p>',
};
