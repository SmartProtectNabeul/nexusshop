import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import styles from './HomePage.module.css';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  category: string;
  thumbnailUrl?: string;
}

const formatPrice = (price: number) => {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice === 0) {
    return null;
  }
  return `${normalizedPrice.toLocaleString()} TND`;
};

const resolveProductImage = (product: Product) => {
  const thumbnail = product.thumbnailUrl;
  if (!thumbnail) {
    return '/thumbnails/code-editor.png';
  }
  return thumbnail;
};

export default function HomePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const featuredProducts = products.slice(0, 3);
  const categories = useMemo(
    () => ['all', ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const fetchProducts = useCallback(async (hardRefresh = false) => {
    // 1. Try to load from cache first if not a hard refresh
    if (!hardRefresh) {
      const cached = localStorage.getItem('nexus_products_cache');
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // Cache valid for 30 minutes
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setProducts(data);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cache');
        }
      }
    }

    setIsLoading(!hardRefresh);
    setIsRefreshing(hardRefresh);
    
    try {
      const res = await fetch(`http://localhost:5000/api/products${hardRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
        // Update Cache
        localStorage.setItem('nexus_products_cache', JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);

  useEffect(() => {
    if (featuredProducts.length <= 1) {
      return undefined;
    }
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [featuredProducts.length, nextSlide]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  const featured = featuredProducts[currentSlide];

  return (
    <div className={styles.page}>
      
      {/* Search Header for Mobile/Small Screens if needed, but we use the main layout one */}
      {/* We can sync search with main layout via Context or a custom event */}
      <div style={{ padding: '0 40px', marginBottom: '20px' }}>
         <div style={{ position: 'relative', maxWidth: '500px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
               type="text" 
               placeholder="Filter apps in current view..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  borderRadius: '12px',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-glass-border)',
                  fontSize: '14px',
                  color: '#fff'
               }}
            />
         </div>
      </div>
      
      {/* Featured Hero Carousel */}
      <section className={styles.heroSection}>
         <div className={styles.heroContainer}>
            {featured ? (
             <AnimatePresence mode="wait">
               <motion.div 
                 key={featured.id}
                 className={styles.heroSlide}
                 initial={{ opacity: 0, scale: 1.02 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0 }}
                 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                 onClick={() => navigate(`/product/${featured.id}`)}
               >
                 <div className={styles.heroBackground}>
                   <img
                     src={resolveProductImage(featured)}
                     alt={featured.title}
                     className={styles.heroImage}
                     onError={(event) => {
                       event.currentTarget.src = '/thumbnails/code-editor.png';
                     }}
                   />
                   <div className={styles.heroOverlay}></div>
                 </div>
                    
                 <div className={styles.heroContent}>
                   <div className={styles.heroBadge}>
                     <Sparkles size={14} />
                     Featured App
                   </div>
                       
                   <h1 className={styles.heroTitle}>{featured.title}</h1>
                   <p className={styles.heroDesc}>{(featured.description || '').slice(0, 120)}...</p>
                       
                   <div className={styles.heroActions}>
                     <button 
                       className={styles.heroCta}
                       onClick={(e) => { e.stopPropagation(); navigate(`/product/${featured.id}`); }}
                     >
                       {Number(featured.price || 0) === 0 ? 'GET' : 'BUY'}
                     </button>
                     <span className={styles.heroPrice}>
                       {Number(featured.price || 0) === 0 ? 'FREE' : formatPrice(featured.price)}
                     </span>
                   </div>
                 </div>
               </motion.div>
             </AnimatePresence>
            ) : (
             <div className={styles.heroSlide}>
              <div className={styles.heroContent}>
                <div className={styles.heroBadge}>
                 <Sparkles size={14} />
                 Featured App
                </div>
                <h1 className={styles.heroTitle}>No featured products yet</h1>
                <p className={styles.heroDesc}>Publish a product and mark it LIVE to populate the store.</p>
              </div>
             </div>
            )}
            
            {/* Controls */}
            <div className={styles.heroControls}>
               <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); prevSlide(); }}>
                  <ChevronLeft size={20} />
               </button>
               <div className={styles.indicators}>
                  {featuredProducts.map((item, idx) => (
                     <button 
                      key={item.id || idx} 
                        className={`${styles.indicator} ${idx === currentSlide ? styles.indicatorActive : ''}`}
                        onClick={() => setCurrentSlide(idx)}
                     />
                  ))}
               </div>
               <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); nextSlide(); }}>
                  <ChevronRight size={20} />
               </button>
            </div>
         </div>
      </section>

      {/* Category Filters */}
      <section className={styles.filterSection}>
        <div className={styles.refreshRow}>
          <button
            type="button"
            className={styles.refreshButton}
            disabled={isRefreshing}
            onClick={() => fetchProducts(true)}
          >
            {isRefreshing ? 'Refreshing...' : 'Hard Refresh Data'}
          </button>
        </div>
        <div className={styles.filterBar} id="category-filters">
          {categories.map((cat) => (
            <motion.button
              key={cat}
              className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ''}`}
              onClick={() => setActiveCategory(cat)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              id={`filter-${cat}`}
            >
              {cat.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Discovery Grid */}
      <section className={styles.gridSection} id="discovery-grid">
        <motion.div
          className={styles.grid}
          layout
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {isLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading products...</p>
          ) : (
            filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))
          )}
        </motion.div>
      </section>
    </div>
  );
}
