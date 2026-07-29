import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Phone, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types/index';

interface CustomerOrderSummary {
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}
interface CustomerDetail extends Profile {
  orders: CustomerOrderSummary[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get<Profile[]>('/api/customers').then(data => {
      setCustomers(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, []);

  const viewCustomer = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await api.get<CustomerDetail>(`/api/customers/${id}`);
      setSelected(data);
    } catch {
      toast.error('Failed to load customer details');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                    {c.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => viewCustomer(c.id)}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600">
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />{c.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-gray-400 shrink-0" />
                  Joined {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {customers.length === 0 && <p className="text-gray-500 text-sm">No customers yet.</p>}

      <Dialog open={detailLoading || !!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {detailLoading || !selected ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-600" /></div>
          ) : (
            <div className="space-y-3 text-sm">
              <div><Label>Name</Label><p className="font-medium">{selected.full_name || 'Unnamed'}</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Email</Label><p>{selected.email || '—'}</p></div>
                <div><Label>Phone</Label><p>{selected.phone || '—'}</p></div>
              </div>
              <div><Label>Joined</Label><p>{new Date(selected.created_at).toLocaleDateString()}</p></div>
              <div>
                <Label>Recent Orders</Label>
                <div className="space-y-1 mt-1">
                  {(selected.orders || []).length === 0 && <p className="text-gray-400 text-xs py-2">No orders yet.</p>}
                  {(selected.orders || []).map(o => (
                    <div key={o.order_number} className="flex items-center justify-between border-b border-gray-50 pb-1.5 pt-0.5">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{o.order_number}</p>
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-semibold">GHS {Number(o.total_amount || 0).toFixed(2)}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${statusColors[o.status] || 'bg-gray-100 text-gray-500'}`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

