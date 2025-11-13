require("dotenv").config();

module.exports = {
  development: {
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || "mysql",
    logging: process.env.DB_LOGGING || false,
  },
  test: {
    database: process.env.STAGING_DB_NAME || process.env.DB_NAME,
    username: process.env.STAGING_DB_USERNAME || process.env.DB_USERNAME,
    password: process.env.STAGING_DB_PASSWORD || process.env.DB_PASSWORD,
    host: process.env.STAGING_DB_HOST || process.env.DB_HOST,
    port: process.env.STAGING_DB_PORT || process.env.DB_PORT,
    dialect: process.env.STAGING_DB_DIALECT || process.env.DB_DIALECT,
    logging: false,
  },
  production: {
    database: process.env.PRODUCTION_DB_NAME || process.env.DB_NAME,
    username: process.env.PRODUCTION_DB_USERNAME || process.env.DB_USERNAME,
    password: process.env.PRODUCTION_DB_PASSWORD || process.env.DB_PASSWORD,
    host: process.env.PRODUCTION_DB_HOST || process.env.DB_HOST,
    port: process.env.STAGING_DB_PORT || process.env.DB_PORT,
    dialect: process.env.PRODUCTION_DB_DIALECT || process.env.DB_DIALECT,
    logging: false,
  },
};
