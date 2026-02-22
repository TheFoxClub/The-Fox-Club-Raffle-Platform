"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class system_fee extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  system_fee.init(
    {
      holder_participant_fee: DataTypes.DECIMAL(10, 5), //holder participant fee while participating in raffle
      non_holder_participant_fee: DataTypes.DECIMAL(10, 5), //non holder participant fee while participating in raffle
      transaction_fee: DataTypes.DECIMAL(10, 5), //system SOL transaction fee
      featured_raffle_fee: DataTypes.DECIMAL(10, 5), //raffle verification SOL fee for verifying raffle
    },
    {
      sequelize,
      modelName: "system_fee",
    }
  );
  return system_fee;
};
