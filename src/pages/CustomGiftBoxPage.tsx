import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '@/services/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, Gift, Package, ArrowRight, Check } from 'lucide-react';
import type { Product } from '@/types/index';

const PACKAGING_STYLES = [
  { name: 'Premium Gold Wrap', price: 12, image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&q=80' },
  { name: 'Elegant Silver Wrap', price: 10, image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=200&q=80' },
  { name: 'Soft Pink Wrap', price: 8, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&q=80' },
  { name: 'Classic Kraft Wrap', price: 6, image: 'https://images.unsplash.com/photo-1607082348824-0a96fd2a3c69?w=200&q=80' },
];

export default function CustomGiftBoxPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ product: Product; qty: number }[]>([]);
  const [packaging, setPackaging] = useState(PACKAGING_STYLES[0]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getProducts({ limit: 50 }).then(setProducts);
  }, []);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const addItem = (product: Product) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setSelectedItems(prev => prev.map(i => i.product.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.product.id !== id));
  };

  const itemsTotal = selectedItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const total = itemsTotal + packaging.price;

  const proceedToCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item.');
      return;
    }
    const boxData = {
      packaging_style: packaging.name,
      personal_message: message,
      items: selectedItems.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        qty: i.qty,
        image_url: i.product.images?.[0],
      })),
      total_price: total,
    };
    localStorage.setItem('customGiftBox', JSON.stringify(boxData));
    toast.success('Gift box saved! Proceeding to checkout...');
    navigate('/checkout?giftbox=custom');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Gift className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Build Your Gift Box</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Product Selection */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">1. Select Products</h3>
            <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filtered.map(p => (
                <div key={p.id} className="border border-gray-100 rounded-lg p-2.5 hover:border-amber-300 transition-colors">
                  <img src={p.images?.[0] || ''} alt={p.name} className="w-full h-20 object-cover rounded-md mb-2 bg-gray-50" />
                  <p className="text-xs font-medium text-gray-900 line-clamp-1 mb-0.5">{p.name}</p>
                  <p className="text-xs text-gray-500 mb-2">GHS {p.price.toFixed(2)}</p>
                  <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => addItem(p)}><Plus className="w-3 h-3 mr-1" /> Add</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">2. Choose Packaging</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PACKAGING_STYLES.map(style => (
                <button
                  key={style.name}
                  onClick={() => setPackaging(style)}
                  className={`border-2 rounded-lg p-2 text-left transition-all ${packaging.name === style.name ? 'border-emerald-600 bg-emerald-50' : 'border-gray-100 hover:border-gray-300'}`}
                >
                  <img src={style.image} alt={style.name} className="w-full h-16 object-cover rounded-md mb-2" />
                  <p className="text-xs font-medium text-gray-900">{style.name}</p>
                  <p className="text-xs text-emerald-600 font-semibold">+GHS {style.price.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">3. Personal Message (Optional)</h3>
            <Textarea placeholder="Write a personal message for the recipient..." value={message} onChange={e => setMessage(e.target.value)} rows={3} />
          </div>
        </div>

        {/* Right: Summary */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Gift Box Summary</h3>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No items selected yet.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {selectedItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 text-sm">
                    <img src={item.product.images?.[0]} alt="" className="w-8 h-8 rounded object-cover bg-gray-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.product.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="p-0.5 hover:bg-gray-100 rounded"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-xs">{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="p-0.5 hover:bg-gray-100 rounded"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-14 text-right">GHS {(item.product.price * item.qty).toFixed(2)}</span>
                    <button onClick={() => removeItem(item.product.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Items</span><span>GHS {itemsTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Packaging ({packaging.name})</span><span>GHS {packaging.price.toFixed(2)}</span></div>
            </div>
            <div className="border-t pt-3 mt-3 mb-4">
              <div className="flex justify-between font-bold text-gray-900 text-lg">
                <span>Total</span>
                <span>GHS {total.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-11" onClick={proceedToCheckout} disabled={selectedItems.length === 0}>
              Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
