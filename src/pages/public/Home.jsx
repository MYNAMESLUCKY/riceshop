import React, { useEffect, useState } from 'react';
import { ChevronRight, ShoppingBag, Star, Search, Filter } from 'lucide-react';
import { products as localProducts } from '../../data/products';
import { fetchProducts } from '../../lib/db';
import { useCartStore } from '../../store/useCartStore';
import toast from 'react-hot-toast';

// Map DB field name to consistent object used in cart
const normalize = (p) => ({
  ...p,
  image: p.image_url || p.image,
});

const Hero = () => (
  <section className="hero">
    <div className="container hero-grid">
      <div className="hero-content">
        <h1>Authentic <span>Premium Rice</span> for Every Cuisine</h1>
        <p>Discover the finest selection of Basmati, Jasmine, and exotic grain varieties sourced from the world's most trusted farms.</p>
        <div className="hero-buttons">
          <a href="#products" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Explore Collection <ChevronRight size={18} />
          </a>
        </div>
      </div>
      <div className="hero-image-wrapper">
        <img
          className="hero-image"
          src="https://images.unsplash.com/photo-1574316075902-692ab80126ff?q=80&w=1200&auto=format&fit=crop"
          alt="Premium golden rice grains"
        />
      </div>
    </div>
  </section>
);

const Stats = () => (
  <section className="stats">
    <div className="container stats-grid">
      {[['15+', 'Premium Brands'], ['50+', 'Rice Varieties'], ['10k+', 'Happy Customers'], ['100%', 'Authentic Sourcing']].map(([num, label]) => (
        <div key={label} className="stat-item">
          <div className="stat-number">{num}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  </section>
);

const ProductCard = ({ product }) => {
  const addItem = useCartStore(state => state.addItem);
  
  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, { icon: '🌾' });
  };

  return (
    <div className="product-card">
      <div className="product-img-wrapper">
        <div className="product-badge">{product.type}</div>
        <img src={product.image} alt={product.name} className="product-img" loading="lazy" />
      </div>
      <div className="product-info">
        <div className="product-header">
          <span className="product-company">{product.company}</span>
          <div className="product-rating">
            <Star size={14} fill="#fbbf24" color="#fbbf24" />
            {Number(product.rating).toFixed(1)}
          </div>
        </div>
        <h3 className="product-title">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <div>
            <div className="product-price">₹{Number(product.price).toFixed(2)}</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>per {product.weight}</div>
          </div>
          <button className="add-btn" aria-label="Add to cart" onClick={handleAdd}>
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Home = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts().then(data => {
      const normalized = data.map(normalize);
      setProducts(normalized);
      setFiltered(normalized);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let result = products;
    if (activeType !== 'All') result = result.filter(p => p.type === activeType);
    if (search.trim()) result = result.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, activeType, products]);

  const riceTypes = ['All', ...new Set(products.map(p => p.type))];

  return (
    <>
      <Hero />
      <Stats />
      <section id="products" className="products">
        <div className="container">
          <h2 className="section-title">Exclusive Collection</h2>
          <p className="section-subtitle">Handpicked selection of the highest quality rice varieties from renowned brands across the globe.</p>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search rice or brand..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50px', color: 'white', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {riceTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '50px', border: '1px solid', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', background: activeType === type ? 'var(--primary)' : 'var(--surface)', color: activeType === type ? '#000' : 'var(--text-secondary)', borderColor: activeType === type ? 'var(--primary)' : 'var(--border)' }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading premium grains...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No products found.</div>
          ) : (
            <div className="products-grid">
              {filtered.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
