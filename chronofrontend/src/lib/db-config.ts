// Configuration de la base de données
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chrono_carto'
};

// Configuration alternative pour le développement local
export const localDbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chrono_carto'
};

