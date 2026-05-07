const PRODUCTS_KEY = 'nexusshop:products';
const FEATURED_KEY = 'nexusshop:featuredProducts';
const PRODUCT_PREFIX = 'nexusshop:product:';

const readJson = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Storage can fail in private windows or quota edge cases; the app should still work.
  }
};

export const getCachedProducts = () => readJson(PRODUCTS_KEY, []);
export const getCachedFeaturedProducts = () => readJson(FEATURED_KEY, []);
export const getCachedProduct = (id) => readJson(`${PRODUCT_PREFIX}${id}`, null);

export const cacheProduct = (product) => {
  if (!product?.id) return;
  writeJson(`${PRODUCT_PREFIX}${product.id}`, product);
};

export const cacheProducts = (products) => {
  if (!Array.isArray(products)) return;
  writeJson(PRODUCTS_KEY, products);
  products.forEach(cacheProduct);
};

export const cacheFeaturedProducts = (products) => {
  if (!Array.isArray(products)) return;
  writeJson(FEATURED_KEY, products);
  products.forEach(cacheProduct);
};
