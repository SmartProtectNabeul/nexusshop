import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Tag } from 'lucide-react';
import StarRating from './StarRating';
import styles from './ProductCard.module.css';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  category: string;
  thumbnailUrl?: string;
  thumbnail?: string;
  developer?: { email: string } | string;
}

interface ProductCardProps {
  product: Product;
  index: number;
}

const formatPrice = (price: number) => {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice === 0) {
    return null;
  }
  return `${normalizedPrice.toLocaleString()} TND`;
};

const resolveProductImage = (product: Product) => {
  const thumbnail = product.thumbnailUrl || product.thumbnail;
  if (!thumbnail) {
    return '/thumbnails/code-editor.png';
  }
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://') || thumbnail.startsWith('/')) {
    return thumbnail;
  }
  return thumbnail;
};

export default function ProductCard({ product, index }: ProductCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const priceText = formatPrice(product.price);
  const isFree = Number(product.price || 0) === 0;
  const rating = Number(product.rating || 0);
  const developerName = typeof product.developer === 'object' ? product.developer?.email : product.developer || 'Developer';
  const imageSrc = resolveProductImage(product);
  const productId = product.id;

  const description = product.description || '';
  const shortDesc = description.length > 80
    ? description.slice(0, 80) + '…'
    : description;

  const handleClick = () => {
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
              {product.category}
            </span>
            <StarRating rating={rating} size={12} />
          </div>
          <div className={styles.bottomRow}>
             {isFree ? <span className={styles.freeBadge}>FREE</span> : <span className={styles.price}>{priceText}</span>}
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
        id={`product-card-${productId}`}
      >
        <div className={styles.thumbnailWrap}>
          <motion.img
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
                  {product.category}
                </span>
                <StarRating rating={rating} size={12} />
             </div>
          </div>

          <div className={`${styles.meta} ${isHovered ? styles.hideMeta : ''}`}>
            <StarRating rating={rating} size={12} />
          </div>

          <div className={styles.bottomRow}>
            {isFree ? (
              <span className={styles.freeBadge}>FREE</span>
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
                 {isFree ? 'GET' : 'BUY'}
               </button>
            </div>
          </div>
        </div>

        <div className={`${styles.borderGlow} ${isHovered ? styles.borderGlowActive : ''}`} />
      </motion.article>
    </div>
  );
}
