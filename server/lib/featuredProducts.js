const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '..', 'data');
const dataPath = path.join(dataDir, 'featuredProducts.json');

const readFeaturedIds = () => {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.ids) ? parsed.ids.filter(Boolean) : [];
  } catch (_error) {
    return [];
  }
};

const writeFeaturedIds = (ids) => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify({ ids }, null, 2));
};

module.exports = {
  readFeaturedIds,
  writeFeaturedIds,
};
