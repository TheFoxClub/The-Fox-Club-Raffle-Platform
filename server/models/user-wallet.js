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
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      blockchainNetwork: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pubKey: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "user_wallet",
    }
  );
  return user_wallet;
};
