"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class XpTable extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: "userId",
        targetKey: "id",
        as: "user",
      });

      this.belongsTo(models.SplTokenSendTransaction, {
        foreignKey: "splTokenSendTransactionId",
        targetKey: "id",
        as: "transaction",
      });

      this.belongsTo(models.Raffle, {
        foreignKey: "raffleId",
        targetKey: "id",
        as: "raffle",
      });

      this.belongsTo(models.XpConfig, {
        foreignKey: "configId",
        targetKey: "id",
        as: "config",
      });
    }
  }

  XpTable.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: {
            msg: "User ID is required",
          },
          isInt: {
            msg: "User ID must be an integer",
          },
        },
      },
      sourceType: {
        type: DataTypes.ENUM(
          "ticket_purchase",
          "raffle_revenue",
          "raffle_creation",
        ),
        allowNull: false,
        validate: {
          notNull: {
            msg: "Source type is required",
          },
          isIn: {
            args: [["ticket_purchase", "raffle_revenue", "raffle_creation"]],
            msg: "Invalid source type",
          },
        },
      },
      splTokenSendTransactionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: {
            msg: "Transaction ID must be an integer",
          },
        },
      },
      raffleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: {
            msg: "Raffle ID must be an integer",
          },
        },
      },
      configId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: {
            msg: "Config ID must be an integer",
          },
        },
      },
      usdValue: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: {
            msg: "USD value must be a decimal number",
          },
          min: {
            args: [0],
            msg: "USD value cannot be negative",
          },
        },
      },
      xpEarned: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: {
            msg: "XP earned must be a decimal number",
          },
          min: {
            args: [0],
            msg: "XP earned cannot be negative",
          },
        },
      },
      tokenType: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: {
            msg: "Token type must be an integer",
          },
        },
      },
      tokenAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [1, 255],
            msg: "Token address must be between 1 and 255 characters",
          },
        },
      },
      rawTokenAmount: {
        type: DataTypes.DECIMAL(18, 9),
        allowNull: true,
        validate: {
          isDecimal: {
            msg: "Raw token amount must be a decimal number",
          },
          min: {
            args: [0],
            msg: "Raw token amount cannot be negative",
          },
        },
      },
      conversionRate: {
        type: DataTypes.DECIMAL(20, 9),
        allowNull: true,
        validate: {
          isDecimal: {
            msg: "Conversion rate must be a decimal number",
          },
          min: {
            args: [0],
            msg: "Conversion rate cannot be negative",
          },
        },
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "XpTable",
      tableName: "xp_tables",
      indexes: [
        {
          fields: ["userId"],
        },
        {
          fields: ["sourceType"],
        },
        {
          fields: ["splTokenSendTransactionId"],
        },
        {
          fields: ["raffleId"],
        },
        {
          fields: ["configId"],
        },
        {
          fields: ["createdAt"],
        },
        {
          unique: true,
          fields: ["userId", "sourceType", "splTokenSendTransactionId"],
          where: {
            splTokenSendTransactionId: {
              [sequelize.Sequelize.Op.ne]: null,
            },
          },
        },
      ],
    },
  );

  return XpTable;
};
