"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class spl_token_send_transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.hasMany(models.XpTable, {
        sourceKey: "id",
        foreignKey: "splTokenSendTransactionId",
        as: "xpRecords",
      });

      this.belongsTo(models.Raffle, {
        foreignKey: "raffleId",
        targetKey: "id",
        as: "raffle",
      });
    }
  }
  spl_token_send_transaction.init(
    {
      senderPubkey: DataTypes.STRING,
      receiverPubkey: DataTypes.STRING,
      type: DataTypes.INTEGER,
      txId: DataTypes.TEXT,
      tokenAddress: DataTypes.STRING,
      decimals: DataTypes.INTEGER,
      uiAmount: DataTypes.STRING,
      status: DataTypes.INTEGER,
      additionalJson: DataTypes.JSON,
      commissionRate: DataTypes.DECIMAL(10, 4),
      commissionAmount: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("commissionAmount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue(
            "commissionAmount",
            val !== null && val !== undefined ? String(val) : "0"
          );
        },
      },
      creatorAmount: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("creatorAmount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue(
            "creatorAmount",
            val !== null && val !== undefined ? String(val) : "0"
          );
        },
      },
      isNFTHolder: DataTypes.BOOLEAN,
      raffleId: DataTypes.INTEGER,
      rewardTransferType: DataTypes.STRING,
      rewardName: DataTypes.STRING,
      rewardIndex: DataTypes.INTEGER,
      xpProcessed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "spl_token_send_transaction",
    },
  );
  return spl_token_send_transaction;
};
