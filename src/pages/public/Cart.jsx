import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';

export const Cart = () => {
  const { items, removeItem, updateQuantity, getCartTotal, clearCart } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <ShoppingBag size={64} color="var(--text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Your cart is empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Looks like you haven't added any premium grains yet.</p>
        <Link to="/" className="btn btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '4rem 2rem' }}>
      <h1 className="section-title" style={{ textAlign: 'left' }}>Shopping Cart</h1>
      
      <div className="cart-grid" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {items.map((item) => (
            <div key={item.product.id} style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
              <img src={item.product.image} alt={item.product.name} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} />
              
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>{item.product.company}</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{item.product.name}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.product.weight}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '50px', border: '1px solid var(--border)' }}>
                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Minus size={16} /></button>
                <span style={{ fontWeight: 600, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Plus size={16} /></button>
              </div>
              
              <div style={{ fontSize: '1.2rem', fontWeight: 700, minWidth: '80px', textAlign: 'right' }}>
                ${(item.product.price * item.quantity).toFixed(2)}
              </div>
              
              <button 
                onClick={() => removeItem(item.product.id)}
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button onClick={clearCart} className="btn btn-outline" style={{ alignSelf: 'flex-start', border: 'none', padding: '0' }}>
            <Trash2 size={16} style={{marginRight:'8px'}} /> Clear Cart
          </button>
        </div>
        
        {/* Order Summary */}
        <div>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '24px', position: 'sticky', top: '100px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Order Summary</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '1.25rem', fontWeight: 700, paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>${getCartTotal().toFixed(2)}</span>
            </div>
            
            <button onClick={() => navigate('/checkout')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}>
              Proceed to Checkout <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
