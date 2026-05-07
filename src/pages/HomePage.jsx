import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import PageTransition from '../components/PageTransition';
import styles from './HomePage.module.css';

const formatPrice = (price) => {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice === 0) {
    return null;
  }
  return `${normalizedPrice.toLocaleString()} TND`;
};

const resolveProductImage = (product) => {
  const thumbnail = product.thumbnailUrl || product.thumbnail;
  if (!thumbnail) {
    return '/thumbnails/code-editor.png';
  }
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://') || thumbnail.startsWith('/')) {
    return thumbnail;
  }
  return thumbnail;
};

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isRTL = i18n.language === 'ar';
  const featuredProducts = products.slice(0, 2);
  const categories = useMemo(
    () => ['all', ...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const nextSlide = useCallback(() => {
    if (featuredProducts.length <= 1) {
      return;
    }
    setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
  }, [featuredProducts.length]);

  const prevSlide = useCallback(() => {
    if (featuredProducts.length <= 1) {
      return;
    }
    setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  }, [featuredProducts.length]);

  useEffect(() => {
    let isCancelled = false;

    const fetchProducts = async (hardRefresh = false) => {
      setIsLoading(!hardRefresh);
      setIsRefreshing(hardRefresh);
      try {
        const res = await fetch(`http://localhost:5000/api/products${hardRefresh ? '?refresh=true' : ''}`);
        const data = await res.json();
        if (!isCancelled && Array.isArray(data)) {
          setProducts(data);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchProducts(false);

    return () => {
      isCancelled = true;
    };
  }, []);

  // Auto advance
  useEffect(() => {
    if (featuredProducts.length <= 1) {
      return undefined;
    }
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [featuredProducts.length, nextSlide]);

  useEffect(() => {
    if (currentSlide >= featuredProducts.length && featuredProducts.length > 0) {
      setCurrentSlide(0);
    }
  }, [currentSlide, featuredProducts.length]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('all');
    }
  }, [activeCategory, categories]);

  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const featured = featuredProducts[currentSlide];

  return (
    <PageTransition>
      <div className={styles.page}>
        
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
                       {t('hero.featured', 'Featured App')}
                     </div>
                         
                     <h1 className={styles.heroTitle}>{featured.title}</h1>
                     <p className={styles.heroDesc}>{(featured.description || '').slice(0, 120)}...</p>
                         
                     <div className={styles.heroActions}>
                       <button 
                         className={styles.heroCta}
                         onClick={(e) => { e.stopPropagation(); navigate(`/product/${featured.id}`); }}
                       >
                         {Number(featured.price || 0) === 0 ? t('product.get') : t('product.buy')}
                       </button>
                       <span className={styles.heroPrice}>
                         {Number(featured.price || 0) === 0 ? t('product.free') : formatPrice(featured.price)}
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
                   {t('hero.featured', 'Featured App')}
                  </div>
                  <h1 className={styles.heroTitle}>No featured products yet</h1>
                  <p className={styles.heroDesc}>Publish a product and mark it LIVE to populate the store.</p>
                </div>
               </div>
              )}
              
              {/* Controls */}
              <div className={styles.heroControls}>
                 <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); isRTL ? nextSlide() : prevSlide(); }}>
                    <ChevronLeft size={20} className={isRTL ? 'flip-rtl' : ''} />
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
                 <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); isRTL ? prevSlide() : nextSlide(); }}>
                    <ChevronRight size={20} className={isRTL ? 'flip-rtl' : ''} />
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
              onClick={async () => {
                setIsRefreshing(true);
                setCurrentSlide(0);
                try {
                  const res = await fetch('http://localhost:5000/api/products?refresh=true');
                  const data = await res.json();
                  if (Array.isArray(data)) {
                    setProducts(data);
                  }
                } finally {
                  setIsRefreshing(false);
                }
              }}
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
                {t(`categories.${cat}`, { defaultValue: cat })}
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
    </PageTransition>
  );
}
