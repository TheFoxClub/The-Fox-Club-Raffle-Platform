"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class raffle_reward extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Raffle, {
        targetKey: "id",
        foreignKey: "raffleId",
      });
    }
  }
  raffle_reward.init(
    {
      raffleId: DataTypes.INTEGER,
      rewardType: DataTypes.INTEGER,
      rewardName: DataTypes.STRING,
      mintAddress: DataTypes.STRING,
      amount: DataTypes.DECIMAL(18, 6),
      imageUrl: DataTypes.STRING,
      metadataJson: DataTypes.JSON,
    },
    {
      sequelize,
      modelName: "raffle_reward",
    }
  );
  return raffle_reward;
};
