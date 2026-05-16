import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, ShoppingBag, Users, Package,
  TrendingUp, TrendingDown, ArrowRight, Clock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashStats { total_orders: string; total_revenue: string; total_customers: string }
interface OrderByStatus { status: string; count: string }
interface TopProduct { name: string; qty_sold: string; revenue: string }
interface RecentOrder { order_number: string; shipping_name: string; total_amount: number; status: string; created_at: string }
interface MonthlyPoint { month: string; revenue: string; orders: string }
interface CategoryRevenue { category: string; revenue: string }
interface StatResult {
  totals: DashStats;
  byStatus: OrderByStatus[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  monthlyRevenue: MonthlyPoint[];
  categoryRevenue: CategoryRevenue[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];
const STATUS_STYLES: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  confirmed:  'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped:    'bg-purple-100 text-purple-800',
  delivered:  'bg-emerald-100 text-emerald-800',
  cancelled:  'bg-red-100 text-red-800',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v >= 1_000_000 ? `GHS ${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `GHS ${(v / 1_000).toFixed(1)}K`
  : `GHS ${v.toFixed(2)}`;

const pct = (a: number, b: number) => b === 0 ? null : Math.round(((a - b) / b) * 100);

// ── Custom tooltip ────────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-amber-600">Revenue: {fmt(payload[0]?.value ?? 0)}</p>
      {payload[1] && <p className="text-blue-500">Orders: {payload[1].value}</p>}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: number | null;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
            {trend !== null && trend !== undefined && (
              <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend)}% vs last month
              </p>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashStats>({ total_orders: '0', total_revenue: '0', total_customers: '0' });
  const [byStatus, setByStatus] = useState<OrderByStatus[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ category: string; revenue: number }[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<StatResult>('/api/orders/admin/stats').catch(() => null),
      api.get<unknown[]>('/api/products/admin/all').catch(() => []),
    ]).then(([result, products]) => {
      if (result) {
        setStats(result.totals ?? { total_orders: '0', total_revenue: '0', total_customers: '0' });
        setByStatus(result.byStatus ?? []);
        setTopProducts(result.topProducts ?? []);
        setRecentOrders(result.recentOrders ?? []);
        setMonthlyData((result.monthlyRevenue ?? []).map(m => ({
          month: m.month, revenue: Number(m.revenue), orders: Number(m.orders),
        })));
        setCategoryData((result.categoryRevenue ?? []).map(c => ({
          category: c.category, revenue: Number(c.revenue),
        })));
      }
      setProductCount(Array.isArray(products) ? products.length : 0);
    }).finally(() => setLoading(false));
  }, []);

  const lastRev = monthlyData[monthlyData.length - 1]?.revenue ?? 0;
  const prevRev = monthlyData[monthlyData.length - 2]?.revenue ?? 0;
  const revTrend = pct(lastRev, prevRev);

  const statCards = [
    { label: 'Total Revenue',  value: fmt(Number(stats.total_revenue)), sub: 'Paid orders only',
      icon: DollarSign, color: 'text-amber-600 bg-amber-50', trend: revTrend },
    { label: 'Total Orders', value: Number(stats.total_orders).toLocaleString(),
      sub: `${byStatus.find(s => s.status === 'pending')?.count ?? 0} pending`,
      icon: ShoppingBag, color: 'text-blue-600 bg-blue-50', trend: null },
    { label: 'Customers', value: Number(stats.total_customers).toLocaleString(), sub: 'Unique buyers',
      icon: Users, color: 'text-emerald-600 bg-emerald-50', trend: null },
    { label: 'Products', value: productCount.toLocaleString(), sub: 'In catalogue',
      icon: Package, color: 'text-purple-600 bg-purple-50', trend: null },
  ];

  const pieData = byStatus.map(s => ({ name: s.status, value: Number(s.count) }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/admin/orders">
          <Button variant="outline" size="sm">
            View Orders <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts row 1: Revenue trend + Status donut */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Trend — Last 12 Months</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {monthlyData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-gray-400">No revenue data yet</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pieData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-gray-400">No orders yet</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'orders']} />
                    <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Top products + Category revenue */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Products by Units Sold</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {topProducts.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-gray-400">No sales data yet</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={topProducts.map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, qty: Number(p.qty_sold) }))}
                    layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(v: number) => [v, 'units sold']} />
                    <Bar dataKey="qty" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-gray-400">No category data yet</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryData} margin={{ top: 0, right: 8, bottom: 24, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                    <Tooltip formatter={(v: number) => [fmt(v), 'revenue']} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={28}>
                      {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Recent Orders
            </CardTitle>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 px-5 pb-5">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Order #</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.order_number} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium whitespace-nowrap text-gray-700">{o.order_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{o.shipping_name || 'Guest'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 hidden md:table-cell">
                        {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{fmt(Number(o.total_amount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
