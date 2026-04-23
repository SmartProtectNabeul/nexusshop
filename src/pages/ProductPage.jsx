import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  HardDrive,
  Calendar,
  Tag,
  User,
  Monitor,
  Star,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import StarRating from '../components/StarRating';
import { products, formatPrice, formatDownloads } from '../data/products';
import styles from './ProductPage.module.css';

export default function ProductPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const product = products.find((p) => p.slug === slug);
  const isRTL = i18n.language === 'ar';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (!product) {
    return (
      <PageTransition>
        <div className={styles.notFound}>
          <h2>Product not found</h2>
          <button onClick={() => navigate('/')} className={styles.backBtn}>
            <BackArrow size={18} />
            {t('product.backToStore')}
          </button>
        </div>
      </PageTransition>
    );
  }

  const priceText = formatPrice(product.price);
  const isFree = product.price === 0;

  return (
    <PageTransition>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Back button */}
          <motion.button
            className={styles.backBtn}
            onClick={() => navigate('/')}
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            id="back-to-store"
          >
            <BackArrow size={18} />
            {t('product.backToStore')}
          </motion.button>

          {/* Product Header */}
          <div className={styles.header}>
            {/* Thumbnail */}
            <motion.div
              className={styles.thumbnailWrap}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={product.thumbnail}
                alt={product.title}
                className={styles.thumbnail}
              />
            </motion.div>

            {/* Info */}
            <motion.div
              className={styles.headerInfo}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className={styles.title}>{product.title}</h1>
              <p className={styles.developer}>
                <User size={14} />
                {product.developer}
              </p>

              <div className={styles.ratingRow}>
                <StarRating rating={product.rating} size={16} />
                <span className={styles.downloadCount}>
                  <Download size={14} />
                  {formatDownloads(product.totalDownloads)} {t('product.downloads')}
                </span>
              </div>

              <div className={styles.priceAction}>
                {isFree ? (
                  <span className={styles.freeLabel}>{t('product.free')}</span>
                ) : (
                  <span className={styles.priceLabel}>{priceText}</span>
                )}

                <motion.button
                  className={styles.getButton}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  id="product-get-btn"
                >
                  {isFree ? t('product.get') : t('product.buy')}
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Description */}
          <motion.section
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h2 className={styles.sectionTitle}>{t('product.description')}</h2>
            <p className={styles.description}>{product.description}</p>
          </motion.section>

          {/* System Info */}
          <motion.section
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h2 className={styles.sectionTitle}>{t('product.systemInfo')}</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Tag size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.category')}</span>
                  <span className={styles.infoValue}>{t(`categories.${product.category}`)}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><HardDrive size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.size')}</span>
                  <span className={styles.infoValue}>{product.storageSize}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Star size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.version')}</span>
                  <span className={styles.infoValue}>v{product.version}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Calendar size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.lastUpdated')}</span>
                  <span className={styles.infoValue}>{product.lastUpdated}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Monitor size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.requirements')}</span>
                  <span className={styles.infoValue}>{product.requirements}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Download size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.downloads')}</span>
                  <span className={styles.infoValue}>{product.totalDownloads.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </PageTransition>
  );
}
