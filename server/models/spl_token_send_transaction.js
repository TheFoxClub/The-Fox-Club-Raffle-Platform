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
      // define association here
    }
  }
  spl_token_send_transaction.init(
    {
      senderPubkey: DataTypes.STRING,
      receiverPubkey: DataTypes.STRING,
      type: DataTypes.INTEGER,
      txId: DataTypes.STRING,
      tokenAddress: DataTypes.STRING,
      decimals: DataTypes.DECIMAL(10, 2),
      uiAmount: DataTypes.STRING,
      status: DataTypes.INTEGER,
      additionalJson: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "spl_token_send_transaction",
    }
  );
  return spl_token_send_transaction;
};
