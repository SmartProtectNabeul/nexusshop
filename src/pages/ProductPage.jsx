import { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
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
  X,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import StarRating from '../components/StarRating';
import { AuthContext } from '../context/AuthContext';
import { cacheProduct, getCachedProduct } from '../lib/storefrontCache';
import styles from './ProductPage.module.css';

const formatPrice = (price) => {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice === 0) {
    return null;
  }
  return `${normalizedPrice.toLocaleString()} TND`;
};

const formatDownloads = (count) => {
  const normalizedCount = Number(count || 0);
  if (normalizedCount >= 1000000) return `${(normalizedCount / 1000000).toFixed(1)}M`;
  if (normalizedCount >= 1000) return `${(normalizedCount / 1000).toFixed(1)}K`;
  return normalizedCount.toString();
};

const resolveProductImage = (product) => {
  const thumbnail = product?.thumbnailUrl || product?.thumbnail;
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

const readProductTransition = (id) => {
  const rawTransition = sessionStorage.getItem('productTransition');
  if (!rawTransition) return null;
  try {
    const parsed = JSON.parse(rawTransition);
    return parsed?.id === id && parsed?.rect ? parsed : null;
  } catch (_error) {
    return null;
  } finally {
    sessionStorage.removeItem('productTransition');
  }
};

export default function ProductPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);
  const [product, setProduct] = useState(() => getCachedProduct(id));
  const [isLoading, setIsLoading] = useState(() => !getCachedProduct(id));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [productApiKey, setProductApiKey] = useState('');
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [entryTransition, setEntryTransition] = useState(() => readProductTransition(id));
  const isRTL = i18n.language === 'ar';
  const renderEntryOverlay = () => entryTransition ? (
    <motion.div
      className={styles.entryOverlay}
      initial={{
        top: entryTransition.rect.top,
        left: entryTransition.rect.left,
        width: entryTransition.rect.width,
        height: entryTransition.rect.height,
        borderRadius: 16,
        opacity: 1,
      }}
      animate={{
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        opacity: 0,
      }}
      transition={{ duration: 0.76, ease: [0.16, 1, 0.3, 1] }}
    >
      <img src={entryTransition.image} alt="" />
      <div>
        <span>{entryTransition.title}</span>
      </div>
    </motion.div>
  ) : null;

  useEffect(() => {
    if (!entryTransition) return undefined;
    const scrollTimer = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 90);
    const timer = window.setTimeout(() => setEntryTransition(null), 780);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(timer);
    };
  }, [entryTransition]);

  const fetchProductApiKey = useCallback(async () => {
    if (!user || !id) return;
    setIsLoadingApiKey(true);
    try {
      const res = await fetch(`http://localhost:5000/api/sdk/product/${id}/api-key`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProductApiKey(data.apiKey || '');
      }
    } catch (err) {
      console.error('Failed to fetch API key:', err);
    } finally {
      setIsLoadingApiKey(false);
    }
  }, [id, user]);

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerating your API key will break existing installations using the old key. Proceed?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/sdk/product/${id}/api-key`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setProductApiKey(data.apiKey);
        toast.success('New API key generated');
      }
    } catch (err) {
      toast.error('Failed to regenerate API key');
    }
  };

  const parseJsonSafely = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { error: text };
    }
  };

  const fetchProduct = async (hardRefresh = false) => {
    const cachedProduct = getCachedProduct(id);
    if (!hardRefresh && cachedProduct) {
      setProduct(cachedProduct);
      setIsLoading(false);
      setIsRefreshing(false);
      setLoadError('');
      return cachedProduct;
    }

    setIsLoading(!hardRefresh);
    setIsRefreshing(hardRefresh);
    setLoadError('');
    try {
      const url = `http://localhost:5000/api/products/${id}${hardRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await parseJsonSafely(res);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch product');
      }
      setProduct(data);
      cacheProduct(data);
      return data;
    } catch (error) {
      setLoadError(error.message);
      return null;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchPurchaseStatus = async (hardRefresh = false) => {
    if (!user || !id) {
      setPurchaseStatus(null);
      return;
    }
    setIsCheckingPurchase(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/payments/purchase-status/${id}${hardRefresh ? '?refresh=true' : ''}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await parseJsonSafely(res);
      if (res.ok) {
        setPurchaseStatus(data);
      }
    } catch (_error) {
      setPurchaseStatus(null);
    } finally {
      setIsCheckingPurchase(false);
    }
  };

  const fetchReviews = async (hardRefresh = false) => {
    setIsLoadingReviews(true);
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}/reviews${hardRefresh ? '?refresh=true' : ''}`);
      const data = await parseJsonSafely(res);
      if (res.ok && Array.isArray(data)) {
        setReviews(data);
      } else {
        setReviews([]);
      }
    } catch (_error) {
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      if (!getCachedProduct(id)) {
        await fetchProduct(false);
      }
      if (!isCancelled) {
        await fetchPurchaseStatus(false);
        await fetchReviews(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  useEffect(() => {
    if (purchaseStatus?.isOwner) {
      fetchProductApiKey();
    }
  }, [purchaseStatus?.isOwner]);

  const myExistingReview = user ? reviews.find((item) => item.buyerId === user.id) : null;

  useEffect(() => {
    if (myExistingReview) {
      setReviewRating(myExistingReview.rating || 5);
      setReviewComment(myExistingReview.comment || '');
    }
  }, [myExistingReview]);

  useEffect(() => {
    if (lightboxIndex === null) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxIndex(null);
      }
      if (event.key === 'ArrowLeft') {
        moveLightbox(isRTL ? 1 : -1);
      }
      if (event.key === 'ArrowRight') {
        moveLightbox(isRTL ? -1 : 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, product?.mediaUrls?.length, isRTL]);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <PageTransition skipInitial={Boolean(entryTransition)}>
        <div className={styles.page}>
          {renderEntryOverlay()}
          <div className={`${styles.notFound} ${entryTransition ? styles.loadingBehindEntry : ''}`}>
            <h2>Loading product...</h2>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!product) {
    return (
      <PageTransition skipInitial={Boolean(entryTransition)}>
        <div className={styles.notFound}>
          <h2>{loadError || 'Product not found'}</h2>
          <button onClick={() => navigate('/')} className={styles.backBtn}>
            <BackArrow size={18} />
            {t('product.backToStore')}
          </button>
        </div>
      </PageTransition>
    );
  }

  const priceText = formatPrice(product.price);
  const isFree = Number(product.price || 0) === 0;
  const rating = Number(product.rating || 0);
  const totalDownloads = Number(product?._count?.transactions || 0);
  const developerName = product.developer?.email || 'Developer';
  const productImage = resolveProductImage(product);
  const version = product.version || '1.0.0';
  const lastUpdated = product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A';
  const requirements = product.requirements || 'See product description';
  const storageSize = product.storageSize || 'N/A';
  const galleryItems = Array.isArray(product.mediaUrls) ? product.mediaUrls : [];
  const lightboxItem = lightboxIndex === null ? null : galleryItems[lightboxIndex];
  const demoVideoEmbedUrl = getYouTubeEmbedUrl(product.demoVideoUrl);
  const demoVideoUrl = product.demoVideoUrl;
  const canDownload = Boolean(purchaseStatus?.canDownload);
  const isFreeOrOwned = Boolean(purchaseStatus?.isFree || purchaseStatus?.isOwner);

  const handlePrimaryAction = async () => {
    if (!user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }

    if (canDownload) {
      try {
        const res = await fetch(`http://localhost:5000/api/products/${id}/download`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await parseJsonSafely(res);
        if (!res.ok) {
          toast.error(data.error || 'Failed to create download link');
          return;
        }
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
        toast.success('Download link generated');
      } catch (_error) {
        toast.error('Failed to download app');
      }
      return;
    }

    setIsBuying(true);
    try {
      const res = await fetch('http://localhost:5000/api/payments/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ productId: id }),
      });
      const data = await parseJsonSafely(res);
      if (!res.ok) {
        toast.error(data.error || 'Failed to buy product');
        if (data.code === 'INSUFFICIENT_CREDITS') {
          navigate('/credits');
        }
        return;
      }
      if (data.user) {
        login(data.user, localStorage.getItem('token'));
      }
      toast.success(data.message || 'Product purchased');
      await fetchPurchaseStatus(true);
      await fetchProduct(true);
    } catch (_error) {
      toast.error('Failed to buy product');
    } finally {
      setIsBuying(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }
    setIsSavingReview(true);
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          rating: Number(reviewRating),
          comment: reviewComment.trim(),
        }),
      });
      const data = await parseJsonSafely(res);
      if (!res.ok) {
        toast.error(data.error || 'Failed to submit review');
        return;
      }
      toast.success('Review saved');
      await fetchProduct(true);
      await fetchReviews(true);
    } catch (_error) {
      toast.error('Failed to submit review');
    } finally {
      setIsSavingReview(false);
    }
  };

  const moveLightbox = (step) => {
    setLightboxIndex((current) => {
      if (current === null || galleryItems.length === 0) return null;
      return (current + step + galleryItems.length) % galleryItems.length;
    });
  };

  return (
    <PageTransition skipInitial={Boolean(entryTransition)}>
      <div className={styles.page}>
        {renderEntryOverlay()}
        <motion.div
          className={`${styles.container} ${entryTransition ? styles.containerEntering : ''}`}
          initial={entryTransition ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: entryTransition ? 0.62 : 0,
            duration: 0.36,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
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
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={async () => {
              await fetchProduct(true);
              await fetchPurchaseStatus(true);
              await fetchReviews(true);
            }}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Hard Refresh'}
          </button>

          {/* Product Header */}
          <div className={styles.header}>
            {/* Thumbnail */}
            <motion.div
              className={styles.thumbnailWrap}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.img
                layoutId={`product-image-${product.id}`}
                src={productImage}
                alt={product.title}
                className={styles.thumbnail}
                onError={(event) => {
                  event.currentTarget.src = '/thumbnails/code-editor.png';
                }}
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
                {developerName}
              </p>

              <div className={styles.ratingRow}>
                <StarRating rating={rating} size={16} />
                <span className={styles.downloadCount}>
                  <Download size={14} />
                  {formatDownloads(totalDownloads)} {t('product.downloads')}
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
                  onClick={handlePrimaryAction}
                  disabled={isBuying || isCheckingPurchase}
                >
                  {isBuying
                    ? 'Processing...'
                    : canDownload
                      ? 'Download'
                      : (isFreeOrOwned || isFree)
                        ? t('product.get')
                        : 'Buy with credits'}
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

          {/* Gallery */}
          {galleryItems.length > 0 && (
            <motion.section
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              <h2 className={styles.sectionTitle}>Gallery</h2>
              <div className={styles.galleryGrid}>
                {galleryItems.map((item, index) => (
                  <div
                    key={item}
                    role="button"
                    tabIndex={0}
                    className={styles.galleryCard}
                    onClick={() => setLightboxIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setLightboxIndex(index);
                      }
                    }}
                  >
                    {isVideoUrl(item) ? (
                      <video src={item} className={styles.galleryImage} controls preload="metadata" />
                    ) : (
                      <img
                        src={item}
                        alt={`${product.title} gallery`}
                        className={styles.galleryImage}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = '/thumbnails/code-editor.png';
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {demoVideoUrl && (
            <motion.section
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.47, duration: 0.5 }}
            >
              <h2 className={styles.sectionTitle}>Demo Video</h2>
              <div className={styles.videoFrame}>
                {demoVideoEmbedUrl ? (
                  <iframe
                    src={demoVideoEmbedUrl}
                    title={`${product.title} demo video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video src={demoVideoUrl} controls preload="metadata" />
                )}
              </div>
            </motion.section>
          )}

          {/* Reviews */}
          <motion.section
            className={styles.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 0.5 }}
          >
            <h2 className={styles.sectionTitle}>Reviews</h2>
            {purchaseStatus?.purchased ? (
              <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
                <div>
                  <span className={styles.reviewFieldLabel}>Rating</span>
                  <div
                    className={styles.starPicker}
                    onMouseLeave={() => setReviewHoverRating(0)}
                    role="radiogroup"
                    aria-label="Review rating"
                  >
                    {[1, 2, 3, 4, 5].map((value) => {
                      const isActive = value <= (reviewHoverRating || reviewRating);
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`${styles.starPickButton} ${isActive ? styles.starPickButtonActive : ''}`}
                          onMouseEnter={() => setReviewHoverRating(value)}
                          onFocus={() => setReviewHoverRating(value)}
                          onClick={() => setReviewRating(value)}
                          aria-label={`${value} star${value === 1 ? '' : 's'}`}
                          aria-checked={reviewRating === value}
                          role="radio"
                        >
                          <Star size={24} />
                        </button>
                      );
                    })}
                    <span className={styles.starPickerValue}>{reviewRating}/5</span>
                  </div>
                </div>
                <label>
                  Comment
                  <textarea
                    className={styles.reviewTextarea}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share what you liked or what can be improved."
                  />
                </label>
                <button type="submit" className={styles.reviewSubmit} disabled={isSavingReview}>
                  {isSavingReview ? 'Saving...' : (myExistingReview ? 'Update Review' : 'Submit Review')}
                </button>
              </form>
            ) : (
              <p className={styles.reviewHint}>Only users who purchased this app can submit a review.</p>
            )}

            {isLoadingReviews ? (
              <p className={styles.reviewHint}>Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className={styles.reviewHint}>No reviews yet.</p>
            ) : (
              <div className={styles.reviewList}>
                {reviews.map((review) => (
                  <article key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewTop}>
                      <div className={styles.reviewAuthor}>
                        <span className={styles.reviewAvatar}>{String(review.buyer?.email || 'U').charAt(0).toUpperCase()}</span>
                        <div>
                          <strong>{review.buyer?.email || 'User'}</strong>
                          <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent review'}</span>
                        </div>
                      </div>
                      <StarRating rating={Number(review.rating || 0)} size={14} />
                    </div>
                    <p>{review.comment || 'No comment provided.'}</p>
                  </article>
                ))}
              </div>
            )}
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
                  <span className={styles.infoValue}>{t(`categories.${product.category}`, { defaultValue: product.category })}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><HardDrive size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.size')}</span>
                  <span className={styles.infoValue}>{storageSize}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Star size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.version')}</span>
                  <span className={styles.infoValue}>v{version}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Calendar size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.lastUpdated')}</span>
                  <span className={styles.infoValue}>{lastUpdated}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Monitor size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.requirements')}</span>
                  <span className={styles.infoValue}>{requirements}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoIcon}><Download size={16} /></span>
                <div>
                  <span className={styles.infoLabel}>{t('product.downloads')}</span>
                  <span className={styles.infoValue}>{totalDownloads.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Developer SDK Section */}
          {purchaseStatus?.isOwner && (
            <motion.section
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.5 }}
            >
              <h2 className={styles.sectionTitle}>Developer SDK Integration</h2>
              <p className={styles.description}>
                Use the Nexus Link SDK to protect your app. Verify user licenses by calling our API from within your application.
              </p>

              <div className={styles.apiKeyBox} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                padding: '20px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.05)',
                marginTop: '15px'
              }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Product API Key</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <code style={{ 
                    background: '#000', 
                    padding: '10px 15px', 
                    borderRadius: '6px', 
                    flexGrow: 1, 
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}>
                    {isLoadingApiKey ? 'Loading...' : (productApiKey || 'No key generated yet')}
                  </code>
                  <button 
                    className={styles.getButton} 
                    onClick={() => {
                      navigator.clipboard.writeText(productApiKey);
                      toast.success('API Key copied');
                    }}
                    style={{ padding: '0 15px' }}
                  >
                    Copy
                  </button>
                  <button 
                    className={styles.refreshBtn} 
                    onClick={handleRegenerateKey}
                    style={{ margin: 0 }}
                  >
                    Regenerate
                  </button>
                </div>
                <p className={styles.infoLabel} style={{ marginTop: '10px', fontSize: '12px', color: '#ef4444' }}>
                  Keep this key secret. Never share it or include it in client-side code that can be easily decompiled.
                </p>
              </div>

              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Integration Example (Node.js)</h3>
                <pre style={{ 
                  background: '#1e293b', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  overflowX: 'auto',
                  color: '#e2e8f0'
                }}>
{`const verifyLicense = async (userToken) => {
  const response = await fetch('http://localhost:5000/api/sdk/v1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productApiKey: '${productApiKey || 'YOUR_API_KEY'}',
      userToken: userToken // Collected from user
    })
  });
  return await response.json();
};`}
                </pre>
              </div>
            </motion.section>
          )}

          {lightboxItem && (
            <motion.div
              className={styles.lightbox}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxIndex(null)}
            >
              <button type="button" className={styles.lightboxClose} onClick={() => setLightboxIndex(null)} aria-label="Close gallery">
                <X size={22} />
              </button>
              {galleryItems.length > 1 && (
                <button
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    moveLightbox(isRTL ? 1 : -1);
                  }}
                  aria-label="Previous image"
                >
                  <ArrowLeft size={26} />
                </button>
              )}
              <div className={styles.lightboxStage} onClick={(event) => event.stopPropagation()}>
                {isVideoUrl(lightboxItem) ? (
                  <video src={lightboxItem} controls autoPlay />
                ) : (
                  <img src={lightboxItem} alt={`${product.title} gallery enlarged`} />
                )}
              </div>
              {galleryItems.length > 1 && (
                <button
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    moveLightbox(isRTL ? -1 : 1);
                  }}
                  aria-label="Next image"
                >
                  <ArrowRight size={26} />
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
