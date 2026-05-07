import { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Download,
  HardDrive,
  Calendar,
  Tag,
  User,
  Star,
} from 'lucide-react';
import StarRating from '../components/StarRating';
import { AuthContext } from '../context/AuthContext';
import styles from './ProductPage.module.css';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  rating: number;
  category: string;
  version?: string;
  requirements?: string;
  storageSize?: string;
  thumbnailUrl?: string;
  mediaUrls?: string[];
  createdAt?: string;
  developer?: { email: string };
  developerId: string;
  _count?: { transactions: number };
}

const formatPrice = (price: number) => {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice === 0) {
    return null;
  }
  return `${normalizedPrice.toLocaleString()} TND`;
};

const formatDownloads = (count: number) => {
  const normalizedCount = Number(count || 0);
  if (normalizedCount >= 1000000) return `${(normalizedCount / 1000000).toFixed(1)}M`;
  if (normalizedCount >= 1000) return `${(normalizedCount / 1000).toFixed(1)}K`;
  return normalizedCount.toString();
};

const resolveProductImage = (product: Product | null) => {
  const thumbnail = product?.thumbnailUrl;
  if (!thumbnail) {
    return '/thumbnails/code-editor.png';
  }
  return thumbnail;
};

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState<any>(null);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);

  const user = auth?.user;

  const checkInstallation = useCallback(async () => {
    if (!id) return;
    const installed = await window.api.checkInstalled(id);
    setIsInstalled(installed);
  }, [id]);

  useEffect(() => {
    checkInstallation();

    const unsubProgress = window.api.onDownloadProgress((data) => {
      if (data.productId === id) {
        setDownloadProgress(data.progress);
        if (data.status) setStatusText(data.status);
      }
    });

    const unsubComplete = window.api.onDownloadComplete((data) => {
      if (data.productId === id) {
        setDownloadProgress(null);
        setStatusText('');
        if (data.success) {
          setIsInstalled(true);
          toast.success('App installed successfully');
        } else {
          toast.error(data.error || 'Installation failed');
        }
      }
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, [id, checkInstallation]);

  const fetchProduct = useCallback(async (hardRefresh = false) => {
    setIsLoading(!hardRefresh);
    try {
      const url = `http://localhost:5000/api/products/${id}${hardRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setProduct(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchPurchaseStatus = useCallback(async () => {
    if (!user || !id) return;
    setIsCheckingPurchase(true);
    try {
      const res = await fetch(`http://localhost:5000/api/payments/purchase-status/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPurchaseStatus(data);
      }
    } catch (_error) {
      setPurchaseStatus(null);
    } finally {
      setIsCheckingPurchase(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchProduct();
    fetchPurchaseStatus();
  }, [fetchProduct, fetchPurchaseStatus]);

  if (isLoading) return <div className={styles.notFound}><h2>Loading...</h2></div>;
  if (!product) return <div className={styles.notFound}><h2>Product not found</h2></div>;

  const priceText = formatPrice(product.price);
  const isFree = Number(product.price || 0) === 0;
  const rating = Number(product.rating || 0);
  const totalDownloads = Number(product?._count?.transactions || 0);
  const developerName = product.developer?.email || 'Developer';
  const productImage = resolveProductImage(product);
  const canDownload = Boolean(purchaseStatus?.canDownload);

  const handleInstall = async () => {
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}/download`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.api.startDownload(data.downloadUrl, id);
        toast.success('Starting download...');
      } else {
        toast.error(data.error || 'Failed to get download link');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleLaunch = async () => {
    if (!id) return;
    const res = await window.api.launchApp(id);
    if (res.success) {
      toast.success('Launching app...');
    } else {
      toast.error(res.error || 'Failed to launch');
    }
  };

  const handleBuy = async () => {
    if (!auth?.user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }
    if (!id) return;

    setIsBuying(true);
    try {
      const res = await fetch('http://localhost:5000/api/payments/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ productId: id })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to buy product');
        return;
      }
      if (data.user) {
        auth.login(data.user, localStorage.getItem('token') || '');
      }
      toast.success(data.message || 'Product purchased');
      await fetchPurchaseStatus();
      await fetchProduct(true);
    } catch (_error) {
      toast.error('Failed to buy product');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate('/store')}>
          <ArrowLeft size={18} /> Back to Store
        </button>

        <div className={styles.header}>
          <div className={styles.thumbnailWrap}>
            <img src={productImage} alt={product.title} className={styles.thumbnail} />
          </div>

          <div className={styles.headerInfo}>
            <h1 className={styles.title}>{product.title}</h1>
            <p className={styles.developer}><User size={14} /> {developerName}</p>

            <div className={styles.ratingRow}>
              <StarRating rating={rating} size={16} />
              <span className={styles.downloadCount}>
                <Download size={14} /> {formatDownloads(totalDownloads)} Downloads
              </span>
            </div>

            <div className={styles.priceAction}>
              {isFree ? <span className={styles.freeLabel}>FREE</span> : <span className={styles.priceLabel}>{priceText}</span>}

              {downloadProgress !== null ? (
                <div style={{ flexGrow: 1, maxWidth: '200px' }}>
                  <div style={{ fontSize: '12px', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                    {statusText || 'Downloading...'} {Math.round(downloadProgress)}%
                  </div>
                  <div style={{ height: '6px', background: 'var(--surface-dark)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-gradient)', width: `${downloadProgress}%`, transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              ) : isInstalled ? (
                <button className={styles.getButton} onClick={handleLaunch} style={{ background: 'var(--success)', color: '#fff' }}>
                  LAUNCH
                </button>
              ) : (
                <button 
                  className={styles.getButton} 
                  onClick={canDownload ? handleInstall : handleBuy}
                  disabled={isCheckingPurchase || isBuying}
                >
                  {isBuying ? 'BUYING...' : canDownload ? 'INSTALL' : 'BUY WITH CREDITS'}
                </button>
              )}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Description</h2>
          <p className={styles.description}>{product.description}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>System Info</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}><Tag size={16} /></span>
              <div>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>{product.category}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}><HardDrive size={16} /></span>
              <div>
                <span className={styles.infoLabel}>Size</span>
                <span className={styles.infoValue}>{product.storageSize || 'N/A'}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}><Star size={16} /></span>
              <div>
                <span className={styles.infoLabel}>Version</span>
                <span className={styles.infoValue}>v{product.version || '1.0.0'}</span>
              </div>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}><Calendar size={16} /></span>
              <div>
                <span className={styles.infoLabel}>Released</span>
                <span className={styles.infoValue}>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
