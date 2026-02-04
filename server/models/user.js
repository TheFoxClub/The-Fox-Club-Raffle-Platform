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
      this.hasMany(models.RaffleTicket, {
        sourceKey: "id",
        foreignKey: "userId",
      });
      this.hasMany(models.XpTable, {
        sourceKey: "id",
        foreignKey: "userId",
        as: "xpRecords"
      });
    }
  }
  user.init(
    {
      blockchainNetwork: DataTypes.INTEGER,
      pubkey: DataTypes.STRING,
      totalXp: {
        type: DataTypes.DECIMAL(18, 6),
        defaultValue: 0,
        allowNull: false
      },
      xpLastUpdated: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }
    },
    {
      sequelize,
      modelName: "user",
    }
  );

  return user;
};
