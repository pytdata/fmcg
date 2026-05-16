import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Browse our products and add items to your cart.</p>
        <Link to="/shop"><Button className="bg-amber-600 hover:bg-amber-700">Continue Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {cartItems.map(item => (
            <div key={item.id} className="flex gap-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <Link to={`/product/${item.product?.slug}`} className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                <img src={item.product?.images?.[0] || '/placeholder.svg'} alt={item.product?.name} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.product?.slug}`} className="text-sm font-semibold text-gray-900 hover:text-amber-600 line-clamp-1">{item.product?.name}</Link>
                <p className="text-xs text-gray-500 mt-0.5">{item.product?.category?.name}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2.5 py-1 hover:bg-gray-50"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2.5 py-1 hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">GHS {((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>GHS {cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Delivery</span><span>Calculated at checkout</span></div>
            </div>
            <div className="border-t pt-3 mb-5">
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>GHS {cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <Link to="/checkout">
              <Button className="w-full bg-amber-600 hover:bg-amber-700 h-11">Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
            <Link to="/shop" className="block text-center mt-3 text-sm text-amber-600 hover:text-amber-700">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
