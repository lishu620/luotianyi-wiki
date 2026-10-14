const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  const list = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
};

export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 3000),
  globalPrefix: 'api',
  corsOrigins: toList(process.env.CORS_ORIGINS, [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]),

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'luotianyi',
    password: process.env.DB_PASSWORD ?? 'luotianyi',
    database: process.env.DB_DATABASE ?? 'luotianyi_wiki',
    synchronize: toBool(process.env.DB_SYNCHRONIZE, true),
    logging: toBool(process.env.DB_LOGGING, false),
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'luotianyi-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  meili: {
    enabled: toBool(process.env.MEILI_ENABLED, true),
    host: process.env.MEILI_HOST ?? 'http://localhost:7700',
    apiKey: process.env.MEILI_MASTER_KEY ?? 'luotianyi_dev_master_key',
    songIndex: process.env.MEILI_SONG_INDEX ?? 'songs',
  },

  admin: {
    username: process.env.ADMIN_USERNAME ?? 'admin',
    password: process.env.ADMIN_PASSWORD ?? 'luotianyi2026',
  },
});
