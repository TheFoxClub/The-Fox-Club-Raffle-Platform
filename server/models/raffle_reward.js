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
      this.belongsTo(models.User, {
        targetKey: "id",
        foreignKey: "winnerId",
        as: "winner",
      });
      this.belongsTo(models.RaffleTicket, {
        targetKey: "id",
        foreignKey: "winnerTicketId",
        as: "winnerTicket",
      });
      this.belongsTo(models.SplTokenSendTransaction, {
        targetKey: "id",
        foreignKey: "splTokenTransferTxId",
        as: "transferTransaction",
      });
      this.belongsTo(models.SplTokenSendTransaction, {
        targetKey: "id",
        foreignKey: "splTokenClaimTxId",
        as: "claimTransaction",
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
      imageUrl: DataTypes.TEXT,
      metadataJson: DataTypes.JSON,
      winnerId: DataTypes.INTEGER,
      winnerTicketId: DataTypes.INTEGER,
      isClaimed: DataTypes.BOOLEAN,
      splTokenTransferTxId: DataTypes.INTEGER,
      splTokenClaimTxId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "raffle_reward",
    }
  );
  return raffle_reward;
};
