import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

export default function MyLibraryPage() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    if (!auth?.user) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/purchases', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPurchases(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [auth?.user]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  if (!auth?.user) {
    // Note: navigate here might cause loop if not careful, but usually fine in useEffect or similar
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Please login to view your library</h2>
            <button onClick={() => navigate('/login')} style={{ marginTop: '20px', color: 'var(--accent-cyan)' }}>Go to Login</button>
        </div>
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>My Library</h1>
        <button onClick={() => navigate('/store')} style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
          Back to Store
        </button>
      </header>

      {isLoading ? (
        <p>Loading your apps...</p>
      ) : purchases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'var(--surface-card)', borderRadius: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>You haven't purchased any apps yet.</p>
          <button 
            onClick={() => navigate('/store')}
            style={{ padding: '12px 24px', background: 'var(--accent-gradient)', borderRadius: '8px', fontWeight: 700 }}
          >
            Browse Store
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '24px' 
        }}>
          {purchases.map((purchase) => (
            <ProductCard key={purchase.product.id} product={purchase.product} index={0} />
          ))}
        </div>
      )}
    </div>
  );
}
