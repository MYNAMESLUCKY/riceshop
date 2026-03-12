import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Star, ShoppingBag, ChevronDown, X, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../store/useCartStore';
import { formatCurrencyINR } from '../../lib/format';
import { Reveal } from '../../components/Reveal';
import toast from 'react-hot-toast';

const norm = (product) => ({
  ...product,
  image: product.image_url || product.image,
  category_name: product.product_categories?.name || '',
});

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'price:asc', label: 'Price: Low to High' },
  { value: 'price:desc', label: 'Price: High to Low' },
  { value: 'rating:desc', label: 'Top Rated' },
];

function SkeletonCard() {
  return (
    <div className="surface-card section-card" style={{ minHeight: 360, opacity: 0.55 }}>
      <div style={{ height: 180, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />
      <div className="stack-md" style={{ marginTop: '1.25rem' }}>
        <div style={{ width: '40%', height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ width: '75%', height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ width: '100%', height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <motion.div layout>
      <div className="product-card">
        <div className="product-img-wrapper">
          <div className="product-badge">{product.type || product.category_name || 'Rice'}</div>
          {product.compare_price && (
            <div className="badge" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.15)', color: '#fda4a4', borderColor: 'rgba(239,68,68,0.25)' }}>
              Sale
            </div>
          )}
          <img
            src={product.image}
            alt={product.name}
            className="product-img"
            loading="lazy"
            onError={(event) => {
              event.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=400';
            }}
          />
        </div>
        <div className="product-info">
          <div className="product-header">
            <span className="product-company">{product.company}</span>
            <div className="product-rating">
              <Star size={13} fill="#f2cc0d" color="#f2cc0d" />
              {Number(product.rating).toFixed(1)}
            </div>
          </div>
          <h3 className="product-title">{product.name}</h3>
          <p className="product-desc">{product.description}</p>
          <div className="product-footer">
            <div>
              <div className="product-price">{formatCurrencyINR(product.price)}</div>
              {product.compare_price && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                  {formatCurrencyINR(product.compare_price)}
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>per {product.weight}</div>
            </div>
            <button
              className="add-btn"
              onClick={() => {
                addItem(product);
                toast.success(`${product.name} added to cart`, { icon: '🌾' });
              }}
              aria-label="Add to cart"
            >
              <ShoppingBag size={20} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState('created_at:desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: categoryRows }, { data: productRows }] = await Promise.all([
      supabase.from('product_categories').select('id,name,slug').eq('is_active', true).order('sort_order'),
      supabase.from('products').select('*, product_categories(name, slug), inventory(quantity_in_stock)').eq('is_active', true).is('deleted_at', null),
    ]);
    setCategories(categoryRows || []);
    setProducts((productRows || []).map(norm));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const [sortField, sortDir] = sort.split(':');
    return [...products]
      .filter((product) => activeCategory === 'all' || product.category_id === activeCategory)
      .filter((product) => !search.trim() || [product.name, product.company, product.category_name].some((value) => (value || '').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        const av = a[sortField] ?? 0;
        const bv = b[sortField] ?? 0;
        if (av === bv) return 0;
        return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
  }, [activeCategory, products, search, sort]);

  const activeLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label || 'Sort';

  return (
    <div className="page-shell">
      <section className="container">
        <Reveal className="page-header">
          <div className="badge">Premium Collection</div>
          <h1 className="page-title" style={{ marginTop: '0.9rem' }}>
            Shop <span className="page-title-accent">Fresh Rice</span>
          </h1>
          <p className="page-subtitle">
            Explore curated premium grains with cleaner filters, faster browsing, and consistent INR pricing.
          </p>
        </Reveal>

        <Reveal className="surface-card section-card" delay={0.05}>
          <div className="filter-bar" style={{ marginBottom: '1rem' }}>
            <div className="search-input-wrapper">
              <Search size={17} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rice, brands, or categories"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowSortMenu((value) => !value)} style={{ minWidth: 200 }}>
                <SlidersHorizontal size={16} />
                {activeLabel}
                <ChevronDown size={16} style={{ transform: showSortMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>
              {showSortMenu && (
                <div className="surface-card" style={{ position: 'absolute', top: 'calc(100% + 0.6rem)', right: 0, minWidth: 220, padding: '0.5rem', zIndex: 20 }}>
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSort(option.value);
                        setShowSortMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        background: sort === option.value ? 'rgba(242,204,13,0.12)' : 'transparent',
                        color: sort === option.value ? 'var(--primary)' : 'var(--text-primary)',
                        borderRadius: 12,
                        padding: '0.8rem 0.9rem',
                        cursor: 'pointer',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="filter-pills">
            <button type="button" onClick={() => setActiveCategory('all')} className={`filter-pill ${activeCategory === 'all' ? 'active' : ''}`}>
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`filter-pill ${activeCategory === category.id ? 'active' : ''}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </Reveal>

        {!loading && (
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 1.5rem' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> {filtered.length === 1 ? 'product' : 'products'}
            {search ? <> for <strong style={{ color: 'var(--primary)' }}>{search}</strong></> : null}
          </p>
        )}

        {loading ? (
          <div className="products-grid">
            {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
          </div>
        ) : filtered.length === 0 ? (
          <Reveal className="surface-card section-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <Package size={42} style={{ opacity: 0.35, margin: '0 auto 1rem' }} />
            <h3 style={{ margin: 0 }}>No matching products found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Try a different search term or clear your category filter.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => { setSearch(''); setActiveCategory('all'); }}>
              Clear Filters
            </button>
          </Reveal>
        ) : (
          <motion.div layout className="products-grid">
            {filtered.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.03}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </motion.div>
        )}
      </section>

      {showSortMenu && <button type="button" style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'transparent', border: 0 }} aria-label="Close sort menu" onClick={() => setShowSortMenu(false)} />}
    </div>
  );
};
