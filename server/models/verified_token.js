"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class verified_token extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  verified_token.init(
    {
      address: DataTypes.STRING,
      name: DataTypes.STRING,
      symbol: DataTypes.STRING,
      decimals: DataTypes.INTEGER,
      tokenType: DataTypes.INTEGER,
      programId: DataTypes.STRING,
      conversionRate: DataTypes.DECIMAL(20, 9),
      isVerified: DataTypes.BOOLEAN,
      isPaymentToken: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "verified_token",
    }
  );
  return verified_token;
};
