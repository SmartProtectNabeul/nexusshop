import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, ChevronLeft, X, Download, User, Star, Tag, HardDrive, Calendar, Monitor } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import PageTransition from '../components/PageTransition';
import {
  cacheFeaturedProducts,
  cacheProduct,
  cacheProducts,
  getCachedFeaturedProducts,
  getCachedProducts,
} from '../lib/storefrontCache';
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

const getYouTubeEmbedUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1);
    } else if (host.endsWith('youtube.com')) {
      videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch (_error) {
    return null;
  }
};

const isVideoUrl = (value) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(value || ''));

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState(() => getCachedProducts());
  const [featuredProducts, setFeaturedProducts] = useState(() => getCachedFeaturedProducts());
  const [isLoading, setIsLoading] = useState(() => getCachedProducts().length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openDetails, setOpenDetails] = useState(null);

  const isRTL = i18n.language === 'ar';
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
    const hasCachedStorefront = products.length > 0 || featuredProducts.length > 0;

    const fetchProducts = async (hardRefresh = false) => {
      setIsLoading(!hardRefresh);
      setIsRefreshing(hardRefresh);
      try {
        const [productsRes, featuredRes] = await Promise.all([
          fetch(`http://localhost:5000/api/products${hardRefresh ? '?refresh=true' : ''}`),
          fetch(`http://localhost:5000/api/products/featured${hardRefresh ? '?refresh=true' : ''}`),
        ]);
        const [productsData, featuredData] = await Promise.all([
          productsRes.json(),
          featuredRes.json(),
        ]);
        if (!isCancelled) {
          if (Array.isArray(productsData)) {
            setProducts(productsData);
            cacheProducts(productsData);
          }
          if (Array.isArray(featuredData)) {
            setFeaturedProducts(featuredData);
            cacheFeaturedProducts(featuredData);
          }
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

    if (hasCachedStorefront) {
      setIsLoading(false);
    } else {
      fetchProducts(false);
    }

    return () => {
      isCancelled = true;
    };
    // Cache is intentionally authoritative until the refresh button is clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const openProductDetails = (product) => {
    cacheProduct(product);
    setOpenDetails(product);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  return (
    <PageTransition>
      <div className={styles.page}>
        <AnimatePresence mode="wait" initial={false}>
          {openDetails ? (
            <motion.div
              key={`details-${openDetails.id}`}
              className={styles.inlineDetailsPage}
              initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProductDetailsContent
                product={openDetails}
                onClose={() => setOpenDetails(null)}
                t={t}
              />
            </motion.div>
          ) : (
            <motion.div
              key="storefront"
              className={styles.storefrontContent}
              initial={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
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
                   onClick={() => {
                     openProductDetails(featured);
                   }}
                   id={`featured-card-${featured.id}`}
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
                         onClick={(e) => {
                           e.stopPropagation();
                           openProductDetails(featured);
                         }}
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
                  <h1 className={styles.heroTitle}>No featured apps selected</h1>
                  <p className={styles.heroDesc}>Admins can choose which live apps appear here.</p>
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
                  const featuredRes = await fetch('http://localhost:5000/api/products/featured?refresh=true');
                  const [data, featuredData] = await Promise.all([res.json(), featuredRes.json()]);
                  if (Array.isArray(data)) {
                    setProducts(data);
                    cacheProducts(data);
                  }
                  if (Array.isArray(featuredData)) {
                    setFeaturedProducts(featuredData);
                    cacheFeaturedProducts(featuredData);
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
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onOpen={openProductDetails}
                />
              ))
            )}
          </motion.div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function ProductDetailsContent({ product, onClose, t }) {
  const image = resolveProductImage(product);
  const price = formatPrice(product.price);
  const isFree = Number(product.price || 0) === 0;
  const gallery = Array.isArray(product.mediaUrls) ? product.mediaUrls : [];
  const downloads = Number(product?._count?.transactions || 0);
  const rating = Number(product.rating || 0);
  const demoVideoEmbedUrl = getYouTubeEmbedUrl(product.demoVideoUrl);
  const lastUpdated = product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A';
  const version = product.version || '1.0.0';
  const requirements = product.requirements || 'See product description';
  const storageSize = product.storageSize || 'N/A';

  return (
    <div className={styles.detailsScroller}>
      <button type="button" className={styles.detailsClose} onClick={onClose} aria-label="Close details">
        <X size={22} />
      </button>

      <motion.header
        className={styles.detailsHero}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.detailsImageWrap}>
          <motion.img layoutId={`product-image-${product.id}`} src={image} alt={product.title} />
        </div>
        <div className={styles.detailsIntro}>
          <span className={styles.categoryBadge}>
            <Tag size={13} />
            {t(`categories.${product.category}`, { defaultValue: product.category })}
          </span>
          <h1>{product.title}</h1>
          <p className={styles.detailsDeveloper}>
            <User size={15} />
            {product.developer?.email || product.developer || 'Developer'}
          </p>
          <div className={styles.detailsStats}>
            <span><Star size={15} /> {rating.toFixed(1)}</span>
            <span><Download size={15} /> {downloads.toLocaleString()} downloads</span>
          </div>
          <div className={styles.detailsActions}>
            <strong>{isFree ? t('product.free') : price}</strong>
            <button type="button">{isFree ? t('product.get') : t('product.buy')}</button>
          </div>
        </div>
      </motion.header>

      <motion.div
        className={styles.detailsBody}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.52, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      >
        <section className={styles.detailsSection}>
          <h2>{t('product.description')}</h2>
          <p>{product.description}</p>
        </section>

        {gallery.length > 0 && (
          <section className={styles.detailsSection}>
            <h2>Gallery</h2>
            <div className={styles.detailsGallery}>
              {gallery.map((item) => (
                <div key={item} className={styles.detailsGalleryItem}>
                  {isVideoUrl(item) ? (
                    <video src={item} controls preload="metadata" />
                  ) : (
                    <img src={item} alt={`${product.title} gallery`} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {product.demoVideoUrl && (
          <section className={styles.detailsSection}>
            <h2>Demo Video</h2>
            <div className={styles.detailsVideoFrame}>
              {demoVideoEmbedUrl ? (
                <iframe
                  src={demoVideoEmbedUrl}
                  title={`${product.title} demo video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video src={product.demoVideoUrl} controls preload="metadata" />
              )}
            </div>
          </section>
        )}

        <section className={styles.detailsSection}>
          <h2>{t('product.systemInfo')}</h2>
          <div className={styles.detailsInfoGrid}>
            <div className={styles.detailsInfoCard}>
              <Tag size={17} />
              <span>{t('product.category')}</span>
              <strong>{t(`categories.${product.category}`, { defaultValue: product.category })}</strong>
            </div>
            <div className={styles.detailsInfoCard}>
              <HardDrive size={17} />
              <span>{t('product.size')}</span>
              <strong>{storageSize}</strong>
            </div>
            <div className={styles.detailsInfoCard}>
              <Star size={17} />
              <span>{t('product.version')}</span>
              <strong>v{version}</strong>
            </div>
            <div className={styles.detailsInfoCard}>
              <Calendar size={17} />
              <span>{t('product.lastUpdated')}</span>
              <strong>{lastUpdated}</strong>
            </div>
            <div className={styles.detailsInfoCard}>
              <Monitor size={17} />
              <span>{t('product.requirements')}</span>
              <strong>{requirements}</strong>
            </div>
            <div className={styles.detailsInfoCard}>
              <Download size={17} />
              <span>{t('product.downloads')}</span>
              <strong>{downloads.toLocaleString()}</strong>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
