"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class raffle_ticket extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.Raffle, {
        targetKey: "id",
        foreignKey: "raffleId",
      });
      this.belongsTo(models.User, {
        targetKey: "id",
        foreignKey: "userId",
      });
    }
  }
  raffle_ticket.init(
    {
      raffleId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      ticketNumber: DataTypes.INTEGER,
      splTokenSendTxId: DataTypes.STRING,
      isWinner: DataTypes.BOOLEAN,
      commissionRate: DataTypes.DECIMAL(10, 4),
      creatorAmount: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("creatorAmount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue(
            "creatorAmount",
            val !== null && val !== undefined ? String(val) : "0"
          );
        },
      },
    },
    {
      sequelize,
      modelName: "raffle_ticket",
    }
  );
  return raffle_ticket;
};
