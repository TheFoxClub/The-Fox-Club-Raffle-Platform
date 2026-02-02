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
      this.hasMany(models.RaffleReward, {
        sourceKey: "id",
        foreignKey: "raffleId",
      });
      this.hasMany(models.RaffleTicket, {
        sourceKey: "id",
        foreignKey: "raffleId",
      });
      this.belongsTo(models.SplTokenSendTransaction, {
        foreignKey: "creatorClaimTxId",
        targetKey: "id",
        as: "creatorClaimTransaction",
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
      tokenAddress: DataTypes.STRING,
      numberOfWinners: DataTypes.INTEGER,
      status: DataTypes.INTEGER,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      endedAt: DataTypes.DATE,
      totalCommission: DataTypes.DECIMAL(10, 9),
      claimableAmount: DataTypes.DECIMAL(10, 9),
      claimedAmount: DataTypes.DECIMAL(10, 9),
      platformRevenue: DataTypes.DECIMAL(10, 9),
      totalRevenue: DataTypes.DECIMAL(10, 9),
      winnersSelected: DataTypes.BOOLEAN,
      winnersSelectedAt: DataTypes.DATE,
      winnerSelectionSeed: DataTypes.STRING,
      platformWallet: DataTypes.STRING,
      creatorClaimTxId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "raffle",
    }
  );
  return raffle;
};
