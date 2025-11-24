"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    static associate(models) {
      this.hasOne(models.UserInfo, {
        sourceKey: "id",
        foreignKey: "userId",
      });
      this.hasMany(models.Raffle, {
        sourceKey: "id",
        foreignKey: "userId",
      });
    }
  }
  user.init(
    {
      blockchainNetwork: DataTypes.INTEGER,
      pubkey: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "user",
    }
  );

  return user;
};
