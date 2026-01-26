"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ticket_reservation extends Model {
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
  ticket_reservation.init(
    {
      raffleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      walletAddress: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ticketCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reservationId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: "1-> reserved, 2-> confirmed, 3->expired, 4->cancelled"
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      transactionSignature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ticket_reservation",
      indexes: [
        {
          fields: ['raffleId', 'walletAddress'],
        },
        {
          fields: ['status', 'expiresAt'],
        },
        {
          fields: ['reservationId'],
          unique: true,
        },
      ],
    }
  );
  return ticket_reservation;
};