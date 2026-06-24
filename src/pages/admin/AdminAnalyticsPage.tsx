import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Eye, Users, Activity, BarChart3 } from 'lucide-react';
import type { AnalyticsSummary } from '@/types/index';

const RANGES = [7, 30, 90] as const;

const DEVICE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#6b7280'];

const EMPTY_SUMMARY: AnalyticsSummary = {
  totals: { pageviews: 0, visitors: 0, events: 0 },
  series: [],
  top_pages: [],
  referrers: [],
  devices: [],
};

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<AnalyticsSummary>(`/api/analytics/summary?days=${days}`);
        if (!cancelled) setData(res ?? EMPTY_SUMMARY);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
          setData(EMPTY_SUMMARY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days]);

  const stats = [
    { label: 'Pageviews', value: data.totals.pageviews, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'Unique Visitors', value: data.totals.visitors, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Events', value: data.totals.events, icon: Activity, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const hasSeries = data.series.length > 0;
  const hasDevices = data.devices.length > 0;
  const hasPages = data.top_pages.length > 0;
  const hasReferrers = data.referrers.length > 0;
  const maxReferrer = data.referrers.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            First-party traffic insights — no third-party trackers.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {RANGES.map(r => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={days === r ? 'default' : 'ghost'}
              className="h-8 px-3 text-xs"
              onClick={() => setDays(r)}
            >
              {r} days
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {loading ? '—' : s.value.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Traffic over time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Traffic Over Time</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-sm text-gray-400">Loading…</div>
          ) : !hasSeries ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400">
              <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">No traffic data for this period yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart data={data.series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradVis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  name="Pageviews"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradPv)"
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradVis)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top pages + devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : !hasPages ? (
              <div className="p-8 text-center text-sm text-gray-400">No page data yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Path</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600 whitespace-nowrap">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_pages.map((p, idx) => (
                      <tr
                        key={p.path}
                        className={`border-b last:border-0 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                      >
                        <td className="px-4 py-2.5 text-gray-900 font-medium truncate max-w-[260px]">{p.path}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{p.views.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Devices</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading…</div>
            ) : !hasDevices ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">No device data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={data.devices}
                    dataKey="count"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.devices.map((d, idx) => (
                      <Cell key={d.device} fill={DEVICE_COLORS[idx % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top referrers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Referrers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
          ) : !hasReferrers ? (
            <div className="py-6 text-center text-sm text-gray-400">No referrer data yet.</div>
          ) : (
            <ul className="space-y-3">
              {data.referrers.map(r => (
                <li key={r.referrer} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 truncate w-40 shrink-0">{r.referrer}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.max(4, (r.count / maxReferrer) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-14 text-right shrink-0">
                    {r.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
