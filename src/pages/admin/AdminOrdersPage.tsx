import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, Loader2 } from 'lucide-react';
import type { Order } from '@/types/index';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const data = await api.get<Order[]>(`/api/orders${params}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load orders');
    }
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const updateStatus = async (order: Order, status: string) => {
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status });
      toast.success('Status updated');
      fetchOrders();
    } catch { toast.error('Failed to update status'); }
  };

  const updatePayment = async (id: string, payment_status: string) => {
    try {
      await api.patch(`/api/orders/${id}/payment`, { payment_status });
      toast.success('Payment status updated');
      fetchOrders();
    } catch { toast.error('Failed to update payment status'); }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    processing: 'bg-blue-50 text-blue-700',
    shipped: 'bg-purple-50 text-purple-700',
    delivered: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 whitespace-nowrap">Order #</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Date</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Customer</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Type</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">Payment</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Total</th>
              <th className="text-right px-4 py-3 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No orders found</td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{o.order_number}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 whitespace-nowrap max-w-[140px] truncate">{o.shipping_name || o.guest_email || 'Guest'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-medium capitalize">{o.order_type}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {updatingId === o.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    : (
                      <Select value={o.status} onValueChange={v => updateStatus(o, v)}>
                        <SelectTrigger className={`h-7 text-xs border-0 ${statusColors[o.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Select value={o.payment_status} onValueChange={v => updatePayment(o.id, v)}>
                    <SelectTrigger className="h-7 text-xs border-0 bg-gray-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['pending', 'paid', 'failed', 'refunded'].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  GHS {Number(o.total_amount || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Order {o.order_number}</DialogTitle></DialogHeader>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>Status</Label><p className="font-medium capitalize">{o.status}</p></div>
                          <div><Label>Payment</Label><p className="font-medium capitalize">{o.payment_status}</p></div>
                        </div>
                        <div><Label>Customer</Label><p>{o.shipping_name || '—'}</p></div>
                        <div><Label>Phone</Label><p>{o.shipping_phone || '—'}</p></div>
                        <div><Label>Email</Label><p>{o.guest_email || '—'}</p></div>
                        <div><Label>Address</Label>
                          <p>{[o.shipping_address, o.shipping_city, o.shipping_region].filter(Boolean).join(', ')}</p>
                        </div>
                        {o.tracking_number && (
                          <div><Label>Tracking Number</Label><p className="font-medium">{o.tracking_number}</p></div>
                        )}
                        <div>
                          <Label>Items</Label>
                          <div className="space-y-1 mt-1">
                            {(o.items || []).filter(Boolean).map((item, i) => (
                              <div key={item?.id || i} className="flex justify-between border-b border-gray-50 pb-1">
                                <span>{item?.name} ×{item?.quantity}</span>
                                <span className="font-medium">GHS {Number(item?.total_price || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between font-bold text-base pt-2 border-t">
                          <span>Total</span>
                          <span>GHS {Number(o.total_amount || 0).toFixed(2)}</span>
                        </div>
                        {o.notes && <div><Label>Notes</Label><p className="text-gray-600">{o.notes}</p></div>}
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

