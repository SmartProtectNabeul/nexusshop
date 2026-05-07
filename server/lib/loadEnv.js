const path = require('path');
const dotenv = require('dotenv');

const loadEnv = () => {
  const serverEnvPath = path.resolve(__dirname, '..', '.env');
  const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

  dotenv.config({ path: serverEnvPath, quiet: true });
  dotenv.config({ path: rootEnvPath, quiet: true });
};

module.exports = loadEnv;
