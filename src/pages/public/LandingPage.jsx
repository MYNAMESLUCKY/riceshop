import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Star,
  ShoppingBag,
  Award,
  Truck,
  Shield,
  Leaf,
  Clock,
  Quote,
  Wheat,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Package,
  Users,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../store/useCartStore';
import { formatCurrencyINR } from '../../lib/format';
import { Reveal } from '../../components/Reveal';
import toast from 'react-hot-toast';

const norm = (product) => ({ ...product, image: product.image_url || product.image });

function Counter({ target, suffix = '' }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.ceil(target / 45);
    const timer = window.setInterval(() => {
      current = Math.min(current + step, target);
      setValue(current);
      if (current >= target) window.clearInterval(timer);
    }, 25);
    return () => window.clearInterval(timer);
  }, [target]);

  return <span>{value.toLocaleString('en-IN')}{suffix}</span>;
}

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <Reveal className="hero-content">
          <div className="badge">
            <Wheat size={14} />
            Farm Direct Since 2010
          </div>
          <h1>
            Premium rice that feels <span className="page-title-accent">worth ordering</span>
          </h1>
          <p>
            GoldenGrain brings high-quality Basmati, Jasmine, and regional staples together with clear pricing,
            smoother mobile checkout, and dependable delivery.
          </p>
          <div className="hero-buttons">
            <Link to="/shop" className="btn btn-primary">
              Shop Collection
              <ChevronRight size={18} />
            </Link>
            <a href="#featured" className="btn btn-outline">
              Explore Highlights
            </a>
          </div>
        </Reveal>

        <Reveal className="hero-image-wrapper" delay={0.08}>
          <motion.img
            className="hero-image"
            src="https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=1200&auto=format&fit=crop"
            alt="Premium rice assortment"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </Reveal>
      </div>
    </section>
  );
}

function StatsBanner() {
  return (
    <section className="container" style={{ marginTop: '-1rem', marginBottom: '4rem' }}>
      <div className="surface-card section-card stats-grid">
        {[
          { icon: Users, target: 10000, suffix: '+', label: 'Happy Customers', color: '#f2cc0d' },
          { icon: Package, target: 50, suffix: '+', label: 'Rice Varieties', color: '#10b981' },
          { icon: TrendingUp, target: 15, suffix: '+', label: 'Premium Brands', color: '#60a5fa' },
          { icon: CheckCircle, target: 100, suffix: '%', label: 'Authentic Sourcing', color: '#f59e0b' },
        ].map(({ icon: Icon, target, suffix, label, color }, index) => (
          <Reveal key={label} className="section-card" delay={index * 0.04} style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 0.9rem', display: 'grid', placeItems: 'center', border: `1px solid ${color}30`, background: `${color}15` }}>
              <Icon size={22} color={color} />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800 }}><Counter target={target} suffix={suffix} /></div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).eq('is_featured', true).limit(4)
      .then(({ data }) => setProducts((data || []).map(norm)));
  }, []);

  if (!products.length) return null;

  return (
    <section id="featured" className="page-shell">
      <div className="container">
        <Reveal className="section-heading" style={{ textAlign: 'center' }}>
          <div className="badge">Handpicked</div>
          <h2 className="section-title" style={{ marginTop: '0.8rem' }}>Featured <span>Collection</span></h2>
          <p className="section-subtitle">Popular varieties with consistent quality, clean pricing, and fast add-to-cart actions.</p>
        </Reveal>

        <div className="products-grid">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={index * 0.04}>
              <div className="product-card">
                <div className="product-img-wrapper">
                  <div className="product-badge">{product.type || 'Premium'}</div>
                  <img src={product.image} alt={product.name} className="product-img" loading="lazy" />
                </div>
                <div className="product-info">
                  <div className="product-header">
                    <span className="product-company">{product.company}</span>
                    <div className="product-rating"><Star size={14} fill="#f2cc0d" color="#f2cc0d" />{Number(product.rating).toFixed(1)}</div>
                  </div>
                  <h3 className="product-title">{product.name}</h3>
                  <p className="product-desc">{product.description}</p>
                  <div className="product-footer">
                    <div>
                      <div className="product-price">{formatCurrencyINR(product.price)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>per {product.weight}</div>
                    </div>
                    <button className="add-btn" onClick={() => { addItem(product); toast.success(`${product.name} added to cart`, { icon: '🌾' }); }}>
                      <ShoppingBag size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValueGrid() {
  const items = [
    { icon: Leaf, title: 'Natural Quality', desc: 'No unnecessary additives. Just well-sourced grain.', color: '#10b981' },
    { icon: Award, title: 'Verified Suppliers', desc: 'Consistent sourcing from trusted producers.', color: '#f2cc0d' },
    { icon: Truck, title: 'Reliable Delivery', desc: 'Address validation before payment for fewer surprises.', color: '#3b82f6' },
    { icon: Shield, title: 'Secure Payments', desc: 'Razorpay-backed checkout with clearer review states.', color: '#f59e0b' },
    { icon: Clock, title: 'Fast Reorders', desc: 'Mobile-friendly cart and installable web app support.', color: '#8b5cf6' },
    { icon: Package, title: 'Protected Packing', desc: 'Clean packaging and easy order tracking from your account.', color: '#ef4444' },
  ];

  return (
    <section className="page-shell">
      <div className="container">
        <Reveal className="section-heading" style={{ textAlign: 'center' }}>
          <div className="badge">Why GoldenGrain</div>
          <h2 className="section-title" style={{ marginTop: '0.8rem' }}>Designed for better <span>daily ordering</span></h2>
        </Reveal>

        <div className="features-grid">
          {items.map(({ icon: Icon, title, desc, color }, index) => (
            <Reveal key={title} className="surface-card section-card" delay={index * 0.04}>
              <div style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', marginBottom: '1rem', border: `1px solid ${color}30`, background: `${color}15` }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <p style={{ margin: '0.6rem 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const reviews = [
    { name: 'Priya Sharma', city: 'Mumbai', text: 'The Basmati quality is excellent and the new checkout flow is much cleaner on mobile.', rating: 5 },
    { name: 'Rahul Mehta', city: 'Bengaluru', text: 'Fast ordering, clear delivery feedback, and the rice quality has stayed consistent.', rating: 5 },
    { name: 'Ananya Krishnan', city: 'Chennai', text: 'Easy to reorder from the app-like home screen and the grain quality is reliable.', rating: 5 },
  ];

  return (
    <section className="page-shell">
      <div className="container">
        <Reveal className="section-heading" style={{ textAlign: 'center' }}>
          <div className="badge">Customer Feedback</div>
          <h2 className="section-title" style={{ marginTop: '0.8rem' }}>What customers <span>notice most</span></h2>
        </Reveal>

        <div className="info-grid">
          {reviews.map((review, index) => (
            <Reveal key={review.name} className="surface-card section-card" delay={index * 0.04}>
              <Quote size={24} color="#f2cc0d" style={{ opacity: 0.6, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>"{review.text}"</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{review.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={12} />
                    {review.city}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: review.rating }).map((_, starIndex) => (
                    <Star key={starIndex} size={13} fill="#f2cc0d" color="#f2cc0d" />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactStrip() {
  return (
    <section className="page-shell" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="surface-card section-card info-grid">
          {[
            [Phone, '+91 98765 43210', 'Mon-Sat 9am-7pm'],
            [Mail, 'hello@goldengrain.in', 'Replies within 2 hours'],
            [MapPin, 'Mumbai, India', 'Pan-India delivery'],
          ].map(([Icon, label, sub], index) => (
            <Reveal key={label} delay={index * 0.05} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(242,204,13,0.1)', border: '1px solid rgba(242,204,13,0.2)' }}>
                <Icon size={18} color="#f2cc0d" />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{sub}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export const LandingPage = () => (
  <>
    <Hero />
    <StatsBanner />
    <FeaturedProducts />
    <ValueGrid />
    <Testimonials />
    <ContactStrip />
  </>
);
