const store = new Map();

const now = () => Date.now();

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const set = (key, value, ttlMs = 60000) => {
  store.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
  return value;
};

const del = (key) => {
  store.delete(key);
};

const delByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

const fromQuery = (req) => {
  const queryFlag = String(req.query.refresh || '').toLowerCase();
  const headerFlag = String(req.headers['x-force-refresh'] || '').toLowerCase();
  return queryFlag === 'true' || queryFlag === '1' || headerFlag === '1' || headerFlag === 'true';
};

const getOrSet = async (key, ttlMs, forceRefresh, resolver) => {
  if (!forceRefresh) {
    const cached = get(key);
    if (cached !== null) return cached;
  }
  const data = await resolver();
  return set(key, data, ttlMs);
};

module.exports = {
  get,
  set,
  del,
  delByPrefix,
  fromQuery,
  getOrSet,
};
