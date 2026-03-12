import React, { useEffect, useState } from 'react';
import { ChevronRight, ShoppingBag, Star, Search, Filter } from 'lucide-react';
import { fetchProducts } from '../../lib/db';
import { products as localProducts } from '../../data/products';
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
        <p>Experience the finest selection of Basmati, Jasmine, and exotic grain varieties sourced directly from the world's most trusted farms.</p>
        <div className="hero-buttons">
          <a href="#products" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Explore Collection <ChevronRight size={18} />
          </a>
        </div>
      </div>
      <div className="hero-image-wrapper">
        <img
          className="hero-image"
          src="https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=1200&auto=format&fit=crop"
          alt="Premium golden rice grains floating in 3D"
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
    toast.success(`${product.name} added to cart!`, { 
      icon: '🌾',
      style: { background: 'rgba(5, 5, 5, 0.9)', color: '#fff', border: '1px solid rgba(242, 204, 13, 0.3)', backdropFilter: 'blur(10px)' }
    });
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
            <Star size={14} fill="#f2cc0d" color="#f2cc0d" />
            {Number(product.rating).toFixed(1)}
          </div>
        </div>
        <h3 className="product-title">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-footer">
          <div>
            <div className="product-price">₹{Number(product.price).toFixed(2)}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>per {product.weight}</div>
          </div>
          <button className="add-btn" aria-label="Add to cart" onClick={handleAdd}>
            <ShoppingBag size={20} />
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
          <h2 className="section-title">Exclusive <span>Collection</span></h2>
          <p className="section-subtitle" style={{marginBottom: '3rem'}}>
            Handpicked selection of the highest quality rice varieties from renowned brands across the globe, tailored for culinary excellence.
          </p>

          {/* Search + Filter */}
          <div className="filter-bar">
            <div className="search-input-wrapper">
              <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search premium rice or brands..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-pills">
              {riceTypes.map(type => (
                <button
                  key={type}
                  className={`filter-pill ${activeType === type ? 'active' : ''}`}
                  onClick={() => setActiveType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--primary)' }}>
              <div style={{ fontSize: '2rem', animation: 'float3D 2s infinite' }}>🌾</div>
              <div style={{ marginTop: '1rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>Loading Premium Grains...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
              <Search size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>No products found matching your luxury taste.</h3>
              <p style={{ marginTop: '0.5rem' }}>Try refining your search terms.</p>
            </div>
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
