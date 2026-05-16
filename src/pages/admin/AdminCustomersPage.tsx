import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Phone, ShoppingBag } from 'lucide-react';
import type { Profile } from '@/types/index';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Profile[]>([]);

  useEffect(() => {
    api.get<Profile[]>('/api/customers').then(data => {
      setCustomers(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                  {c.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-400 truncate">{c.email}</p>
                </div>
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
    </div>
  );
}

