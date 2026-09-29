import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';

export interface DeliveryQuote {
  id: string; expiresAt: string; address: string; city: string; region: string;
  countryCode: string; method: 'osrm' | 'flat'; feeGhs: number;
  feeUsd?: number; exchangeRate?: number; rateSource?: string; rateAsOf?: string; distanceKm?: number;
}
type Suggestion = { placeId: string; label: string };
export function DeliveryPlaceSearch({ onChange, disabled = false }: { onChange: (quote: DeliveryQuote | null) => void; disabled?: boolean }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(false);
  const [active, setActive] = useState(-1);
  const [locating, setLocating] = useState(false);
  const token = useRef(crypto.randomUUID());
  const version = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => () => { version.current++; }, []);
  useEffect(() => {
    if (selected || input.trim().length < 3) return;
    const requestVersion = version.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const data = await api.post<Suggestion[]>('/api/delivery/places', { input, sessionToken: token.current });
        if (version.current !== requestVersion) return;
        setSuggestions(data);
        if (!data.length) setError('No locations found. Try a street address or landmark.');
      } catch (err) {
        if (version.current === requestVersion) setError(err instanceof Error ? err.message : 'Unable to search locations');
      } finally { if (version.current === requestVersion) setBusy(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [input, selected]);
  async function choose(item: Suggestion) {
    const requestVersion = ++version.current;
    setInput(item.label); setSelected(true); setSuggestions([]); setError(''); setBusy(true);
    onChangeRef.current(null);
    const sessionToken = token.current;
    token.current = crypto.randomUUID();
    try {
      const quote = await api.post<DeliveryQuote>('/api/delivery/quote', { placeId: item.placeId, sessionToken });
      if (version.current === requestVersion) onChangeRef.current(quote);
    } catch (err) {
      if (version.current === requestVersion) setError(err instanceof Error ? err.message : 'Unable to calculate delivery');
    } finally { if (version.current === requestVersion) setBusy(false); }
  }
  async function useCurrentLocation() {
    if (!window.isSecureContext) { setError('Location access requires the secure HTTPS website.'); return; }
    if (!navigator.geolocation) { setError('Your browser does not support location access.'); return; }
    try {
      const permission = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      if (permission?.state === 'denied') {
        setError('Location access is blocked for this site. Open the lock icon beside the address, allow Location, then click “Use my location” again.');
        return;
      }
    } catch { /* Older browsers may not expose the Permissions API. */ }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const place = await api.post<Suggestion>('/api/delivery/reverse', { latitude: position.coords.latitude, longitude: position.coords.longitude });
        await choose(place);
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to identify your current location'); }
      finally { setLocating(false); }
    }, error => {
      setLocating(false);
      if (error.code === error.PERMISSION_DENIED) setError('Location access was denied. Open the lock icon beside the address, allow Location, then click “Use my location” again.');
      else if (error.code === error.TIMEOUT) setError('Location lookup timed out. Try again or search for the address manually.');
      else setError('Unable to identify your current location. Search for the address instead.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
  return <div className="space-y-2">
    <label htmlFor="delivery-place" className="flex items-center gap-1 text-sm text-gray-600"><MapPin className="w-4 h-4" /> Search your delivery address</label>
    <div className="flex gap-2"><Input id="delivery-place" role="combobox" aria-expanded={suggestions.length > 0} aria-controls="delivery-suggestions"
      aria-autocomplete="list" aria-activedescendant={active >= 0 ? `delivery-option-${active}` : undefined}
      autoComplete="off" value={input} disabled={disabled} placeholder="Type a street address or landmark, anywhere in the world"
      onChange={e => {
        version.current++; setInput(e.target.value); setSelected(false); setSuggestions([]); setActive(-1); setBusy(false); setError(''); onChangeRef.current(null);
      }} onKeyDown={e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, suggestions.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        if (e.key === 'Escape') { version.current++; setSuggestions([]); setBusy(false); setActive(-1); }
        if (e.key === 'Enter' && suggestions[active]) { e.preventDefault(); void choose(suggestions[active]); }
      }} /><button type="button" onClick={useCurrentLocation} disabled={disabled || locating} className="shrink-0 rounded-md border px-3 text-xs hover:bg-gray-50" title="Use my current location">{locating ? 'Locating…' : 'Use my location'}</button></div>
    {suggestions.length > 0 && <ul id="delivery-suggestions" role="listbox" className="border rounded-lg bg-white shadow-sm overflow-hidden">
      {suggestions.map((item, i) => <li key={item.placeId} id={`delivery-option-${i}`} role="option" aria-selected={i === active}>
        <button type="button" disabled={disabled} onClick={() => void choose(item)} className={`w-full text-left p-3 text-sm hover:bg-amber-50 ${i === active ? 'bg-amber-50' : ''}`}>{item.label}</button>
      </li>)}
    </ul>}
    <div aria-live="polite">
      {busy && <p className="text-sm text-gray-500 flex gap-2 items-center"><Loader2 className="w-4 h-4 animate-spin" /> {selected ? 'Calculating delivery…' : 'Searching locations…'}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error} Edit the search to try again.</p>}
    </div>
    <p className="text-xs text-gray-500">Choose a suggestion for an accurate delivery fee.</p>
    <p className="text-xs text-gray-500">Location suggestions by <span className="font-medium">Google Maps</span></p>
  </div>;
}
