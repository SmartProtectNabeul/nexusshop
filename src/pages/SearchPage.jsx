import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || '';

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchResults = useCallback(async (hardRefresh = false) => {
    setIsLoading(!hardRefresh);
    setIsRefreshing(hardRefresh);
    try {
      const query = new URLSearchParams({ q, category, sort, ...(hardRefresh ? { refresh: 'true' } : {}) }).toString();
      const res = await fetch(`http://localhost:5000/api/products/search?${query}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [q, category, sort]);

  useEffect(() => {
    fetchResults(false);
  }, [fetchResults]);


  const updateParam = (key, value) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '30px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar Filters */}
      <div style={{ width: '250px', flexShrink: 0, background: '#4444', padding: '20px', borderRadius: '12px', height: 'fit-content' }}>
        <h3 style={{ marginBottom: '20px' }}>Filters</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Category</label>
          <select 
            value={category} 
            onChange={(e) => updateParam('category', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            <option value="">All Categories</option>
            <option value="apps">Apps</option>
            <option value="games">Games</option>
            <option value="tools">Tools</option>
            <option value="themes">Themes</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Sort By</label>
          <select 
            value={sort} 
            onChange={(e) => updateParam('sort', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            <option value="">Newest</option>
            <option value="popularity">Popularity (Downloads)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div style={{ flexGrow: 1 }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ marginBottom: '0px' }}>
            {q ? `Search results for "${q}"` : 'All Products'}
          </h2>
          <button
            type="button"
            onClick={() => fetchResults(true)}
            disabled={isRefreshing}
            style={{
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#111827',
              color: '#cbd5e1',
              padding: '8px 12px',
              fontWeight: 700,
              cursor: isRefreshing ? 'wait' : 'pointer',
              opacity: isRefreshing ? 0.7 : 1,
            }}
          >
            {isRefreshing ? 'Refreshing...' : 'Hard Refresh'}
          </button>
        </div>
        
        {isLoading ? (
          <p>Loading...</p>
        ) : products.length === 0 ? (
          <p style={{ color: '#666' }}>No products found matching your criteria.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {products.map(p => (
              <Link to={`/product/${p.id}`} key={p.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-5px)' } }}>
                  <div style={{ height: '150px', background: '#f5f5f5', backgroundImage: `url(${p.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: '15px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{p.title}</h3>
                    <p style={{ margin: '0 0 10px 0', color: '#888', fontSize: '14px', textTransform: 'capitalize' }}>{p.category}</p>
                    <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                      {p.price === 0 ? 'FREE' : `${p.price} Credits`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
