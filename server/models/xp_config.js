"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class XpConfig extends Model {
    static associate(models) {
      this.hasMany(models.XpTable, {
        sourceKey: "id",
        foreignKey: "configId",
        as: "xpRecords",
      });
    }

    // Helper method to get config value by key
    static async getConfigValue(key) {
      const config = await this.findOne({
        where: { configKey: key, isActive: true }
      });
      return config ? parseFloat(config.configValue) : null;
    }

    // Helper method to update config value
    static async updateConfigValue(key, value) {
      const [config, created] = await this.findOrCreate({
        where: { configKey: key },
        defaults: {
          configKey: key,
          configValue: value,
          isActive: true
        }
      });

      if (!created) {
        await config.update({ configValue: value, updatedAt: new Date() });
      }

      return config;
    }

    // Get all active config as key-value pairs
    static async getAllActiveConfig() {
      const configs = await this.findAll({
        where: { isActive: true }
      });

      return configs.reduce((acc, config) => {
        acc[config.configKey] = parseFloat(config.configValue);
        return acc;
      }, {});
    }
  }

  XpConfig.init(
    {
      configKey: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notNull: {
            msg: "Config key is required"
          },
          notEmpty: {
            msg: "Config key cannot be empty"
          },
          len: {
            args: [1, 100],
            msg: "Config key must be between 1 and 100 characters"
          }
        }
      },
      configValue: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        validate: {
          notNull: {
            msg: "Config value is required"
          },
          isDecimal: {
            msg: "Config value must be a decimal number"
          },
          min: {
            args: [0],
            msg: "Config value cannot be negative"
          }
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "XpConfig",
      tableName: "xp_configs",
      indexes: [
        {
          unique: true,
          fields: ["configKey"]
        },
        {
          fields: ["isActive"]
        }
      ]
    }
  );

  return XpConfig;
};