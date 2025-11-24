"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class raffle_detail extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Raffle, {
        foreignKey: "raffleId",
        targetKey: "id",
      });
    }
  }
  raffle_detail.init(
    {
      raffleId: DataTypes.INTEGER,
      isFeatured: DataTypes.BOOLEAN,
      featuredPosition: DataTypes.INTEGER,
      featuredUntil: DataTypes.DATE,
      requiresNftVerification: DataTypes.BOOLEAN,
      verifiedCollectionRequired: DataTypes.STRING,
      additionalJson: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "raffle_detail",
    }
  );
  return raffle_detail;
};
