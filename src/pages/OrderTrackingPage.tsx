import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getOrderByNumber } from '@/services/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import type { Order } from '@/types/index';

const steps = [
  { status: 'pending', label: 'Order Placed', icon: Clock },
  { status: 'processing', label: 'Processing', icon: Package },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderTrackingPage() {
  const [searchParams] = useSearchParams();
  const initialOrder = searchParams.get('order') || '';
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialOrder) trackOrder(initialOrder);
  }, []);

  const trackOrder = async (num: string) => {
    setLoading(true);
    setError('');
    const data = await getOrderByNumber(num);
    if (!data) {
      setError('Order not found. Please check your order number.');
      setOrder(null);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) trackOrder(orderNumber.trim());
  };

  const currentStepIndex = steps.findIndex(s => s.status === order?.status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Track Your Order</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Enter order number (e.g. KW-ABC123)" className="pl-9" />
        </div>
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={loading}>
          {loading ? 'Searching...' : 'Track'}
        </Button>
      </form>

      {error && <p className="text-red-600 text-sm text-center mb-6">{error}</p>}

      {order && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-lg font-bold text-gray-900">{order.order_number}</p>
            </div>
            <Badge variant="outline" className={`capitalize ${
              order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
              order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {order.status}
            </Badge>
          </div>

          {/* Progress */}
          {order.status !== 'cancelled' && (
            <div className="flex items-center justify-between mb-8 px-2">
              {steps.map((step, i) => {
                const isActive = i <= currentStepIndex;
                return (
                  <div key={step.status} className="flex flex-col items-center relative flex-1">
                    {i < steps.length - 1 && (
                      <div className={`absolute top-3 left-1/2 w-full h-0.5 ${isActive ? 'bg-amber-500' : 'bg-gray-200'}`} />
                    )}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${isActive ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <step.icon className="w-3 h-3" />
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-amber-700' : 'text-gray-400'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Order Date</span>
              <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Payment Status</span>
              <span className="font-medium capitalize">{order.payment_status}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">GHS {order.total_amount.toFixed(2)}</span>
            </div>
            {order.tracking_number && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Tracking Number</span>
                <span className="font-medium">{order.tracking_number}</span>
              </div>
            )}
            {order.shipping_address && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">Shipping Address</span>
                <span className="font-medium text-right max-w-[200px]">{order.shipping_address}, {order.shipping_city}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
