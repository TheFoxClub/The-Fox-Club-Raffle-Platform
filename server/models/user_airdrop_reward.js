"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserAirdropReward extends Model {
    static associate(models) {
      this.belongsTo(models.AirdropDetail, {
        foreignKey: "airdropRewardId",
        as: "airdropDetail",
      });

      this.belongsTo(models.SplTokenSendTransaction, {
        foreignKey: "splTokenSendTxId",
        as: "splTokenSendTx",
      });
    }
  }

  UserAirdropReward.init(
    {
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      airdropRewardId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      pubKey: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      amount: {
        type: DataTypes.STRING(30),
        allowNull: false,
        get() {
          const val = this.getDataValue("amount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(value) {
          if (value === null || value === undefined) {
            this.setDataValue("amount", value);
            return;
          }
          this.setDataValue("amount", String(value));
        },
      },
      xp: {
        type: DataTypes.DECIMAL(20, 6),
        allowNull: false,
        defaultValue: 0,
        get() {
          const val = this.getDataValue("xp");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
      },
      splTokenSendTxId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "UserAirdropReward",
      tableName: "user_airdrop_rewards",
      timestamps: true,
    }
  );

  UserAirdropReward.STATUS = {
    UNCLAIMED: 0,
    CLAIMED: 1,
    PENDING: 2,
  };

  return UserAirdropReward;
};
