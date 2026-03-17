"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AirdropReward extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: "creatorUserId",
        targetKey: "id",
        as: "creator",
      });

      this.hasMany(models.UserAirdropReward, {
        foreignKey: "airdropRewardId",
        as: "userRewards",
      });

      this.belongsTo(models.SplTokenSendTransaction, {
        foreignKey: "fundingTxId",
        targetKey: "id",
        as: "fundingTransaction",
      });
    }
  }

  AirdropReward.init(
    {
      type: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      tokenAddress: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      tokenDecimals: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 9,
      },
      tokenSymbol: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      totalAmount: {
        type: DataTypes.STRING(30),
        allowNull: false,
        get() {
          const val = this.getDataValue("totalAmount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(value) {
          if (value === null || value === undefined) {
            this.setDataValue("totalAmount", value);
            return;
          }
          this.setDataValue("totalAmount", String(value));
        },
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      airdropWallet: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      fundingTxId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      creatorUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "AirdropReward",
      tableName: "airdrop_rewards",
      timestamps: true,
    }
  );

  AirdropReward.STATUS = {
    DRAFT: 0,
    PENDING: 1,
    FUNDED: 2,
    ACTIVE: 3,
    COMPLETED: 4,
    CANCELLED: 5,
  };

  AirdropReward.REWARD_TYPE = {
    SOL: 0,
    SPL_TOKEN: 1,
    SPL_TOKEN_2022: 2,
  };

  return AirdropReward;
};


