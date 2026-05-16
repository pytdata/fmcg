import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Home, CreditCard, Clock } from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const mode = searchParams.get('mode') || 'cod';
  const isStripe = mode === 'stripe';

  return (
    <>
      <PageMeta title="Order Confirmed – KW Enterprise" description="" />
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isStripe ? 'bg-blue-100' : 'bg-green-100'}`}>
          {isStripe ? <CreditCard className="w-8 h-8 text-blue-600" /> : <CheckCircle className="w-8 h-8 text-green-600" />}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isStripe ? 'Order Created!' : 'Order Placed!'}
        </h1>
        <p className="text-gray-500 mb-6">
          {isStripe
            ? 'Your order is saved. Complete your payment in the Stripe tab that just opened.'
            : 'Thank you for your order. We will process it and deliver to your address.'}
        </p>

        {isStripe && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-left">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Payment Pending</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Complete payment in the Stripe checkout tab. Once paid, your order status will automatically update and you'll receive a confirmation SMS/email.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-6 text-left">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-gray-900">Order Details</span>
          </div>
          <p className="text-sm text-gray-600">Order Number: <span className="font-bold text-gray-900">{orderNumber}</span></p>
          <p className="text-sm text-gray-500 mt-1">
            {isStripe
              ? 'Your order will be confirmed automatically after payment is received.'
              : 'Our team will contact you to confirm delivery. You can track your order below.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={`/order-tracking?order=${orderNumber}`}>
            <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
              <Package className="w-4 h-4 mr-2" /> Track Order
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" className="w-full sm:w-auto">
              <Home className="w-4 h-4 mr-2" /> Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
