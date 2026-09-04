"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class raffle_payment_option extends Model {
    static associate(models) {
      this.belongsTo(models.Raffle, { foreignKey: "raffleId" });
    }
  }

  raffle_payment_option.init(
    {
      raffleId: DataTypes.INTEGER,
      tokenAddress: DataTypes.STRING,
      tokenType: DataTypes.INTEGER,
      tokenSymbol: DataTypes.STRING(16),
      decimals: DataTypes.INTEGER,
      ticketPrice: DataTypes.DECIMAL(30, 12),
      baseSolPrice: DataTypes.DECIMAL(30, 12),
      discountPercent: DataTypes.DECIMAL(8, 4),
      priceMode: DataTypes.ENUM("auto", "manual"),
    },
    { sequelize, modelName: "raffle_payment_option" },
  );
  return raffle_payment_option;
};