import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Loader2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Group { code: string; name: string; fee_usd: number | null; is_active: boolean; countries: { code: string; name: string }[] }
function DeliveryGroup({ group, onSaved }: { group: Group; onSaved: (code: string, fee: number, active: boolean) => void }) {
  const [fee, setFee] = useState(group.fee_usd === null ? '' : String(group.fee_usd));
  const [enabled, setEnabled] = useState(group.is_active);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!fee.trim() || !Number.isFinite(Number(fee)) || Number(fee) < 0) { toast.error('Enter a valid USD fee'); return; }
    setSaving(true);
    try {
      await api.put(`/api/delivery/groups/${group.code}`, { fee_usd: Number(fee), is_active: enabled });
      onSaved(group.code, Number(fee), enabled);
      toast.success(`${group.name} delivery fee saved`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to save'); }
    finally { setSaving(false); }
  }
  return <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
    <div className="p-5 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-lg font-semibold">{group.name}</h2><p className="text-xs text-gray-500">{group.countries.length} countries and territories</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <div><label htmlFor={`fee-${group.code}`} className="block text-xs text-gray-600 mb-1">Flat delivery fee (USD)</label>
          <Input id={`fee-${group.code}`} className="w-36" type="number" min="0" max="999999" step="0.01" placeholder="Not configured" value={fee} disabled={saving} onChange={e => setFee(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm h-10"><input type="checkbox" checked={enabled} disabled={saving} onChange={e => setEnabled(e.target.checked)} /> Enabled</label>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save group'}</Button>
      </div>
    </div>
    {group.code === 'AF' && <p className="px-5 py-3 bg-amber-50 text-sm text-amber-900">Ghana always uses road-distance pricing. Africa’s flat fee and enabled status apply to other African countries only.</p>}
    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 p-5">
      {group.countries.map(country => <li key={country.code} className="text-sm flex items-center justify-between gap-2">
        <span>{country.name} <span className="text-xs text-gray-400">{country.code}</span></span>
        {country.code === 'GH' && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full whitespace-nowrap">Distance pricing</span>}
      </li>)}
    </ul>
  </section>;
}
export default function AdminDeliveryLocationsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function load() {
    setLoading(true); setError('');
    api.get<Group[]>('/api/delivery/groups').then(setGroups).catch(err => setError(err.message)).finally(() => setLoading(false));
  }
  useEffect(load, []);
  const term = search.trim().toLowerCase();
  const filtered = groups.map(g => ({ ...g, countries: g.name.toLowerCase().includes(term) ? g.countries : g.countries.filter(c => `${c.name} ${c.code}`.toLowerCase().includes(term)) })).filter(g => g.countries.length);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Delivery Locations</h1><p className="text-gray-500 mt-1">Set a USD flat fee per continent. Customers see USD and the GHS equivalent at checkout.</p></div>
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="bg-white border rounded-xl p-5"><Globe className="text-amber-600 mb-2" /><p className="text-sm text-gray-500">Continents</p><p className="text-2xl font-bold">{groups.length}</p></div>
      <div className="bg-white border rounded-xl p-5"><MapPin className="text-blue-600 mb-2" /><p className="text-sm text-gray-500">Countries and territories</p><p className="text-2xl font-bold">{groups.reduce((n,g) => n + g.countries.length, 0)}</p></div>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5"><p className="font-semibold text-emerald-900">Ghana · road-distance pricing</p><p className="text-sm text-emerald-800 mt-2">Uses the base Delivery Fee from admin Settings, plus the dispatch location, per-kilometre rate and minimum fee configured on the backend.</p></div>
    </div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><Input aria-label="Search countries or continents" className="pl-9" placeholder="Search countries or continents…" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {loading ? <Loader2 className="animate-spin" /> : error ? <div role="alert">{error} <Button onClick={load}>Retry</Button></div> : <>
      {!filtered.length && <p className="text-gray-500">No countries match your search.</p>}
      {filtered.map(group => <DeliveryGroup key={group.code} group={group} onSaved={(code, fee_usd, is_active) => setGroups(previous => previous.map(g => g.code === code ? { ...g, fee_usd, is_active } : g))} />)}
    </>}
  </div>;
}
