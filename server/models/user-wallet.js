"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class user_wallet extends Model {
    static associate(models) {
      // Example: if each wallet belongs to a user
      // this.belongsTo(models.User, { foreignKey: "userId" });
    }
  }

  user_wallet.init(
    {
      userId: DataTypes.INTEGER,
      blockchainNetwork: DataTypes.STRING,
      pubkey: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "user_wallet",
    }
  );
  return user_wallet;
};
