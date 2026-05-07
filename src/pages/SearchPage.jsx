import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import styles from './SearchPage.module.css';

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
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [q, category, sort]);

  useEffect(() => {
    fetchResults(false);
  }, [fetchResults]);

  const updateParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    setSearchParams(nextParams);
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <h3>Filters</h3>

        <label className={styles.field}>
          <span>Category</span>
          <select value={category} onChange={(event) => updateParam('category', event.target.value)}>
            <option value="">All Categories</option>
            <option value="apps">Apps</option>
            <option value="games">Games</option>
            <option value="tools">Tools</option>
            <option value="themes">Themes</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Sort By</span>
          <select value={sort} onChange={(event) => updateParam('sort', event.target.value)}>
            <option value="">Newest</option>
            <option value="popularity">Popularity (Downloads)</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </label>
      </aside>

      <section className={styles.results}>
        <div className={styles.resultsHeader}>
          <h2>{q ? `Search results for "${q}"` : 'All Products'}</h2>
          <button type="button" onClick={() => fetchResults(true)} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Hard Refresh'}
          </button>
        </div>

        {isLoading ? (
          <p className={styles.muted}>Loading...</p>
        ) : products.length === 0 ? (
          <p className={styles.muted}>No products found matching your criteria.</p>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id} className={styles.card}>
                <div className={styles.thumb}>
                  <img src={product.thumbnailUrl} alt={product.title} />
                </div>
                <div className={styles.cardBody}>
                  <h3>{product.title}</h3>
                  <p>{product.category}</p>
                  <strong>{Number(product.price || 0) === 0 ? 'FREE' : `${product.price} Credits`}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
