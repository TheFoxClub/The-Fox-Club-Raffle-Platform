"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("raffles", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      totalTickets: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ticketPrice: {
        type: Sequelize.DECIMAL(18, 8),
        allowNull: false,
      },
      ticketsSold: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      tokenType: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "0 - SOL, 1 - SPL token, 2 - SPL token 2022, 3 - USDC",
      },
      tokenAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'The specific token address for payment (for SPL tokens)'
      },
      numberOfWinners: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment:
          "0 - upcoming, 1 - live, 2 - ended, 3 - cancelled, 4 - suspended",
      },
      totalCommission: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      claimableAmount: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      claimedAmount: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      platformRevenue: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      totalRevenue: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      winnersSelected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      winnersSelectedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      winnerSelectionSeed: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Random seed used for winner selection",
      },
      platformWallet: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Platform wallet that holds the rewards",
      },
      creatorClaimTxId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to the transaction record for creator payout claim'
      },
      xpAwarded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add index for XP processing queries
    await queryInterface.addIndex('raffles', ['xpAwarded', 'status'], {
      name: 'idx_raffles_xp_awarded'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("raffles");
  },
};
