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
      this.hasMany(models.XpTable, {
        sourceKey: "id",
        foreignKey: "raffleId",
        as: "xpRecords"
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
      ticketPrice: DataTypes.DECIMAL(18, 8),
      ticketsSold: DataTypes.INTEGER,
      tokenType: DataTypes.INTEGER,
      tokenAddress: DataTypes.STRING,
      numberOfWinners: DataTypes.INTEGER,
      status: DataTypes.INTEGER,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      endedAt: DataTypes.DATE,
      totalCommission: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("totalCommission");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue("totalCommission", val !== null && val !== undefined ? String(val) : "0");
        },
      },
      claimableAmount: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("claimableAmount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue("claimableAmount", val !== null && val !== undefined ? String(val) : "0");
        },
      },
      claimedAmount: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("claimedAmount");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue("claimedAmount", val !== null && val !== undefined ? String(val) : "0");
        },
      },
      platformRevenue: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("platformRevenue");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue("platformRevenue", val !== null && val !== undefined ? String(val) : "0");
        },
      },
      totalRevenue: {
        type: DataTypes.STRING(30),
        get() {
          const val = this.getDataValue("totalRevenue");
          return val !== null && val !== undefined ? parseFloat(val) : 0;
        },
        set(val) {
          this.setDataValue("totalRevenue", val !== null && val !== undefined ? String(val) : "0");
        },
      },
      winnersSelected: DataTypes.BOOLEAN,
      winnersSelectedAt: DataTypes.DATE,
      winnerSelectionSeed: DataTypes.STRING,
      platformWallet: DataTypes.STRING,
      creatorClaimTxId: DataTypes.INTEGER,
      xpAwarded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "raffle",
    }
  );
  return raffle;
};
