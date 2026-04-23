import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User, Tag } from 'lucide-react';
import StarRating from './StarRating';
import { formatPrice } from '../data/products';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, index }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const priceText = formatPrice(product.price);
  const isFree = product.price === 0;

  const shortDesc = product.description.length > 80
    ? product.description.slice(0, 80) + '…'
    : product.description;

  const handleClick = () => {
    navigate(`/product/${product.slug}`);
  };

  return (
    <div 
       className={styles.cardWrapper}
       onMouseEnter={() => setIsHovered(true)}
       onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible spacer to reserve the correct grid cell height */}
      <div className={styles.spacer}>
        <div className={styles.thumbnailWrap}></div>
        <div className={styles.info}>
          <h3 className={styles.title}>{product.title}</h3>
          <div className={styles.meta}>
            <StarRating rating={product.rating} size={12} />
          </div>
          <div className={styles.bottomRow}>
             {isFree ? <span className={styles.freeBadge}>{t('product.free')}</span> : <span className={styles.price}>{priceText}</span>}
          </div>
        </div>
      </div>

      <motion.article
        className={`${styles.card} ${isHovered ? styles.cardHovered : ''}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          delay: index * 0.06,
          ease: [0.16, 1, 0.3, 1],
        }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        id={`product-card-${product.slug}`}
      >
        <div className={styles.thumbnailWrap}>
          <motion.img
            src={product.thumbnail}
            alt={product.title}
            className={styles.thumbnail}
            animate={{
              scale: isHovered ? 1.08 : 1,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            loading="lazy"
          />
          <div className={`${styles.thumbnailGlow} ${isHovered ? styles.glowActive : ''}`} />
        </div>

        <div className={styles.info}>
          <h3 className={styles.title}>{product.title}</h3>

          <div className={`${styles.extraInfo} ${isHovered ? styles.showExtra : ''}`}>
             <div className={styles.developerRow}>
               <User size={12} />
               <span>{product.developer}</span>
             </div>
             <p className={styles.shortDesc}>{shortDesc}</p>
             <div className={styles.categoryRow}>
                <span className={styles.categoryBadge}>
                  <Tag size={11} />
                  {t(`categories.${product.category}`)}
                </span>
                <StarRating rating={product.rating} size={12} />
             </div>
          </div>

          <div className={`${styles.meta} ${isHovered ? styles.hideMeta : ''}`}>
            <StarRating rating={product.rating} size={12} />
          </div>

          <div className={styles.bottomRow}>
            {isFree ? (
              <span className={styles.freeBadge}>{t('product.free')}</span>
            ) : (
              <span className={styles.price}>{priceText}</span>
            )}
            
            <div className={`${styles.btnWrap} ${isHovered ? styles.showBtn : ''}`}>
               <button
                 className={styles.getBtn}
                 onClick={(e) => {
                   e.stopPropagation();
                   handleClick();
                 }}
               >
                 {isFree ? t('product.get') : t('product.buy')}
               </button>
            </div>
          </div>
        </div>

        <div className={`${styles.borderGlow} ${isHovered ? styles.borderGlowActive : ''}`} />
      </motion.article>
    </div>
  );
}
