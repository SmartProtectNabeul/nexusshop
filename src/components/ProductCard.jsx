import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User, Tag } from 'lucide-react';
import StarRating from './StarRating';
import { cacheProduct } from '../lib/storefrontCache';
import styles from './ProductCard.module.css';

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

export default function ProductCard({ product, index, onOpen }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const priceText = formatPrice(product.price);
  const isFree = Number(product.price || 0) === 0;
  const rating = Number(product.rating || 0);
  const developerName = product.developer?.email || product.developer || 'Developer';
  const imageSrc = resolveProductImage(product);
  const productId = product.id;

  const description = product.description || '';
  const shortDesc = description.length > 80
    ? description.slice(0, 80) + '…'
    : description;

  const handleClick = () => {
    cacheProduct(product);
    const card = document.getElementById(`product-card-${productId}`);
    const rect = card?.getBoundingClientRect();
    if (onOpen) {
      onOpen(product, rect);
      return;
    }
    if (rect) {
      sessionStorage.setItem('productTransition', JSON.stringify({
        id: productId,
        title: product.title,
        image: imageSrc,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        scroll: {
          x: window.scrollX || 0,
          y: window.scrollY || 0,
        },
      }));
    }
    navigate(`/product/${productId}`);
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
            <span className={styles.categoryBadge}>
              <Tag size={11} />
              {t(`categories.${product.category}`, { defaultValue: product.category })}
            </span>
            <StarRating rating={rating} size={12} />
          </div>
          <div className={styles.bottomRow}>
             {isFree ? <span className={styles.freeBadge}>{t('product.free')}</span> : <span className={styles.price}>{priceText}</span>}
          </div>
        </div>
      </div>

      <motion.article
        className={`${styles.card} ${isHovered ? styles.cardHovered : ''}`}
        layoutId={`product-card-${productId}`}
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
        id={`product-card-${productId}`}
      >
        <div className={styles.thumbnailWrap}>
          <motion.img
            layoutId={`product-image-${productId}`}
            src={imageSrc}
            alt={product.title}
            className={styles.thumbnail}
            onError={(event) => {
              event.currentTarget.src = '/thumbnails/code-editor.png';
            }}
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
               <span>{developerName}</span>
             </div>
             <p className={styles.shortDesc}>{shortDesc}</p>
             <div className={styles.categoryRow}>
                <span className={styles.categoryBadge}>
                  <Tag size={11} />
                  {t(`categories.${product.category}`, { defaultValue: product.category })}
                </span>
                <StarRating rating={rating} size={12} />
             </div>
          </div>

          <div className={`${styles.meta} ${isHovered ? styles.hideMeta : ''}`}>
            <StarRating rating={rating} size={12} />
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
