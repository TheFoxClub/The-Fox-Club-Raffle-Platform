const Redis = require("ioredis");
const logger = require("./logger");

class RedisClient {
  constructor() {
    this.client = null;
    this.connect();
  }

  connect() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || "",
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.client.on("connect", () => {
        logger.info("Redis client connected successfully");
      });

      this.client.on("error", (err) => {
        logger.error("Redis Client Error:", err);
      });

      this.client.on("end", () => {
        logger.warn("Redis connection ended");
      });

      this.client.on("reconnecting", () => {
        logger.info("Redis client reconnecting...");
      });
    } catch (error) {
      logger.error("Failed to create Redis client:", error);
    }
  }

  async get(key) {
    try {
      if (!this.client || this.client.status !== "ready") {
        return null;
      }
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.client || this.client.status !== "ready") {
        return false;
      }
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.client || this.client.status !== "ready") {
        return false;
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.client || this.client.status !== "ready") {
        return false;
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async flushAll() {
    try {
      if (!this.client || this.client.status !== "ready") {
        return false;
      }
      await this.client.flushall();
      return true;
    } catch (error) {
      logger.error("Redis FLUSHALL error:", error);
      return false;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.quit();
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
