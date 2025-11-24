"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class raffle extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.User, {
        foreignKey: "userId",
        targetKey: "id",
      });
      this.hasOne(models.RaffleDetail, {
        sourceKey: "id",
        foreignKey: "raffleId",
      });
    }
  }
  raffle.init(
    {
      userId: DataTypes.INTEGER,
      title: DataTypes.STRING(100),
      description: DataTypes.TEXT(2000),
      imageUrl: DataTypes.STRING,
      totalTickets: DataTypes.INTEGER,
      ticketPrice: DataTypes.DECIMAL(10, 2),
      ticketsSold: DataTypes.INTEGER,
      tokenType: DataTypes.INTEGER,
      numberOfWinners: DataTypes.INTEGER,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      endedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "raffle",
    }
  );
  return raffle;
};
