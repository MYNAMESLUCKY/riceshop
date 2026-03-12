import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartStore } from '../../store/useCartStore';
import { formatCurrencyINR } from '../../lib/format';
import { Reveal } from '../../components/Reveal';

export const Cart = () => {
  const { items, removeItem, updateQuantity, getCartTotal, clearCart } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="page-shell">
        <div className="container" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
          <Reveal className="surface-card section-card" style={{ maxWidth: 560, width: '100%', textAlign: 'center', padding: '3rem 1.5rem' }}>
            <ShoppingBag size={58} color="var(--text-secondary)" style={{ opacity: 0.45, marginBottom: '1.25rem' }} />
            <h2 style={{ margin: 0, fontSize: '2rem' }}>Your cart is empty</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
              Add a few rice varieties to compare weights, pricing, and delivery availability.
            </p>
            <Link to="/shop" className="btn btn-primary" style={{ width: 'auto' }}>Browse Collection</Link>
          </Reveal>
        </div>
      </div>
    );
  }

  const total = getCartTotal();

  return (
    <div className="page-shell">
      <div className="container">
        <Reveal className="page-header">
          <div className="badge">Review Cart</div>
          <h1 className="page-title" style={{ marginTop: '0.9rem' }}>
            Ready to <span className="page-title-accent">Check Out</span>
          </h1>
          <p className="page-subtitle">
            Update quantities, remove extras, and continue with a faster INR-first checkout.
          </p>
        </Reveal>

        <div className="cart-grid">
          <div className="stack-md">
            {items.map((item, index) => (
              <Reveal key={item.product.id} delay={index * 0.04}>
                <motion.div layout className="surface-card cart-item">
                  <img src={item.product.image} alt={item.product.name} className="cart-item-media" />

                  <div className="stack-sm" style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--primary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
                      {item.product.company}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{item.product.name}</h3>
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {item.product.weight}
                      </p>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {formatCurrencyINR(item.product.price)} each
                    </div>
                  </div>

                  <div className="quantity-control">
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} aria-label={`Decrease quantity for ${item.product.name}`}>
                      <Minus size={16} />
                    </button>
                    <span style={{ width: 20, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} aria-label={`Increase quantity for ${item.product.name}`}>
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="stack-sm" style={{ alignItems: 'flex-end' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      {formatCurrencyINR(item.product.price * item.quantity)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="btn btn-outline"
                      style={{ color: '#fda4a4', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                </motion.div>
              </Reveal>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/shop" className="btn btn-outline" style={{ width: 'auto' }}>
                Continue Shopping
              </Link>
              <button type="button" onClick={clearCart} className="btn btn-outline" style={{ width: 'auto', color: '#fda4a4', borderColor: 'rgba(239,68,68,0.2)' }}>
                <Trash2 size={16} />
                Clear Cart
              </button>
            </div>
          </div>

          <Reveal className="surface-card section-card summary-card">
            <div className="stack-lg">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Order Summary</h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'} ready for checkout
                </p>
              </div>

              <div className="stack-sm">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrencyINR(total)}</strong>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span>Calculated after address check</span>
                </div>
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <span className="value-strong" style={{ color: 'var(--primary)' }}>{formatCurrencyINR(total)}</span>
                </div>
              </div>

              <div className="stack-sm">
                <div className="checkout-info-box">
                  <div className="summary-row">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <Truck size={16} color="var(--primary)" />
                      Delivery estimate
                    </span>
                    <strong>Same day</strong>
                  </div>
                </div>
                <div className="checkout-info-box">
                  <div className="summary-row">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                      <ShieldCheck size={16} color="var(--primary)" />
                      Payment
                    </span>
                    <strong>Secure Razorpay</strong>
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => navigate('/checkout')} className="btn btn-primary">
                Proceed to Checkout
                <ArrowRight size={18} />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};
