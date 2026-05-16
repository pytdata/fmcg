import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Package, Home } from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';

// This page is shown after the PayStack popup closes.
// The actual payment verification happens inside CheckoutPage's callback.
// We simply display the appropriate status card based on the `status` query param.
export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const mode = searchParams.get('mode') || 'paystack'; // 'paystack' | 'cod'
  const status = searchParams.get('status') || ''; // 'paid' | 'failed' | ''

  const isPaid = status === 'paid' || mode === 'cod';
  const isFailed = status === 'failed';

  return (
    <>
      <PageMeta title="Order Confirmation – KW Enterprise" description="Your order has been placed." />
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        {isPaid ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {mode === 'cod' ? 'Order Placed!' : 'Payment Successful!'}
              </h1>
              <p className="text-gray-500">
                {mode === 'cod'
                  ? 'Your order has been placed and will be delivered to you soon. Pay when it arrives.'
                  : 'Your payment is confirmed and your order is now being processed.'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm text-left space-y-3">
              <div className="flex items-center gap-3 mb-1">
                <Package className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-900">Order Confirmed</span>
              </div>
              {orderNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Number</span>
                  <span className="font-bold text-gray-900">{orderNumber}</span>
                </div>
              )}
              {mode === 'cod' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-700">Cash on Delivery</span>
                </div>
              )}
              <p className="text-xs text-gray-400 pt-1 border-t">
                A confirmation SMS has been sent to your phone number. Track your delivery below.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {orderNumber && (
                <Link to={`/order-tracking?order=${orderNumber}`}>
                  <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
                    <Package className="w-4 h-4 mr-2" /> Track Order
                  </Button>
                </Link>
              )}
              <Link to="/shop">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Home className="w-4 h-4 mr-2" /> Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        ) : isFailed ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
              <p className="text-gray-500 text-sm">
                Your payment could not be confirmed. Your order has been saved — you can retry payment or contact support.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/checkout">
                <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">Retry Checkout</Button>
              </Link>
              <Link to="/orders">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Package className="w-4 h-4 mr-2" /> My Orders
                </Button>
              </Link>
            </div>
            {orderNumber && (
              <p className="text-xs text-gray-400">Order ref: <code className="bg-gray-100 px-1 py-0.5 rounded">{orderNumber}</code></p>
            )}
          </div>
        ) : (
          /* Payment window was closed before completing — order exists but not yet paid */
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Pending</h1>
              <p className="text-gray-500 text-sm">
                You closed the payment window. Your order is saved. You can complete payment via your orders page.
              </p>
            </div>
            {orderNumber && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Order Number</span><span className="font-bold">{orderNumber}</span></div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/checkout">
                <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">Complete Payment</Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="w-full sm:w-auto"><Home className="w-4 h-4 mr-2" /> Shop</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

type VerifyState = 'verifying' | 'success' | 'failed';

