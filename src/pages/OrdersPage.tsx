import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getOrders } from '@/services/store';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronRight } from 'lucide-react';
import type { Order } from '@/types/index';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) getOrders(user.id).then(setOrders);
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Please sign in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No orders yet.</p>
          <Link to="/shop" className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2 inline-block">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-sm font-bold text-gray-900">{order.order_number}</span>
                  <span className="text-xs text-gray-400 ml-2">{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <Badge variant="outline" className={statusColors[order.status] || ''}>{order.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total: <span className="font-bold text-gray-900">GHS {order.total_amount.toFixed(2)}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.order_type === 'gift_box' ? 'Gift Box Order' : 'Regular Order'}</p>
                </div>
                <Link to={`/order-tracking?order=${order.order_number}`} className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium">
                  Track <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
