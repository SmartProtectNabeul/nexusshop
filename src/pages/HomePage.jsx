import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import PageTransition from '../components/PageTransition';
import { products, formatPrice } from '../data/products';
import styles from './HomePage.module.css';

const CATEGORIES = ['all', 'apps', 'websites', 'services', 'extensions'];

const FEATURED_APPS = [
  {
    ...products.find(p => p.slug === 'nova-code-editor'),
    banner: '/hero_nova.png'
  },
  {
    ...products.find(p => p.slug === 'prism-photo-studio'),
    banner: '/hero_prism.png'
  }
];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);

  const isRTL = i18n.language === 'ar';

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % FEATURED_APPS.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + FEATURED_APPS.length) % FEATURED_APPS.length);

  // Auto advance
  useEffect(() => {
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, []);

  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const featured = FEATURED_APPS[currentSlide];

  return (
    <PageTransition>
      <div className={styles.page}>
        
        {/* Featured Hero Carousel */}
        <section className={styles.heroSection}>
           <div className={styles.heroContainer}>
              <AnimatePresence mode="wait">
                 <motion.div 
                    key={currentSlide}
                    className={styles.heroSlide}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => navigate(`/product/${featured.slug}`)}
                 >
                    <div className={styles.heroBackground}>
                       <img src={featured.banner} alt="" className={styles.heroImage} />
                       <div className={styles.heroOverlay}></div>
                    </div>
                    
                    <div className={styles.heroContent}>
                       <div className={styles.heroBadge}>
                          <Sparkles size={14} />
                          {t('hero.featured', 'Featured App')}
                       </div>
                       
                       <h1 className={styles.heroTitle}>{featured.title}</h1>
                       <p className={styles.heroDesc}>{featured.description.slice(0, 120)}...</p>
                       
                       <div className={styles.heroActions}>
                          <button 
                             className={styles.heroCta}
                             onClick={(e) => { e.stopPropagation(); navigate(`/product/${featured.slug}`); }}
                          >
                             {featured.price === 0 ? t('product.get') : t('product.buy')}
                          </button>
                          <span className={styles.heroPrice}>
                             {featured.price === 0 ? t('product.free') : formatPrice(featured.price)}
                          </span>
                       </div>
                    </div>
                 </motion.div>
              </AnimatePresence>
              
              {/* Controls */}
              <div className={styles.heroControls}>
                 <button className={styles.controlBtn} onClick={(e) => { e.stopPropagation(); isRTL ? nextSlide() : prevSlide(); }}>
                    <ChevronLeft size={20} className={isRTL ? 'flip-rtl' : ''} />
                 </button>
                 <div className={styles.indicators}>
                    {FEATURED_APPS.map((_, idx) => (
                       <button 
                          key={idx} 
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
          <div className={styles.filterBar} id="category-filters">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                className={`${styles.filterPill} ${activeCategory === cat ? styles.filterPillActive : ''}`}
                onClick={() => setActiveCategory(cat)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                id={`filter-${cat}`}
              >
                {t(`categories.${cat}`)}
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
            {filtered.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </motion.div>
        </section>
      </div>
    </PageTransition>
  );
}
