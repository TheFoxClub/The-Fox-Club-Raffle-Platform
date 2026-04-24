"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AirdropDetail extends Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: "creatorUserId",
        targetKey: "id",
        as: "creator",
      });

      this.hasMany(models.UserAirdropReward, {
        foreignKey: "airdropRewardId",
        as: "userAirdropRewards",
      });

      this.belongsTo(models.SplTokenSendTransaction, {
        foreignKey: "splTokenSendTxId",
        targetKey: "id",
        as: "splTokenSendTransaction",
      });
    }
  }

  AirdropDetail.init(
    {
      airdropName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
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
      imageUrl: {
        type: DataTypes.TEXT,
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
      splTokenSendTxId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      creatorUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      activationConfig: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "AirdropDetail",
      tableName: "airdrop_details",
      timestamps: true,
    }
  );

  return AirdropDetail;
};


