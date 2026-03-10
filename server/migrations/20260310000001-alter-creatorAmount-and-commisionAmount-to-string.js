"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      "spl_token_send_transactions",
      "creatorAmount",
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: "0",
      }
    );
    await queryInterface.changeColumn(
      "spl_token_send_transactions",
      "commissionAmount",
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: "0",
      }
    );
    await queryInterface.changeColumn(
      "raffle_tickets",
      "creatorAmount",
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: "0",
      }
    );
    const raffleAmountColumns = [
      "totalCommission",
      "claimableAmount",
      "claimedAmount",
      "platformRevenue",
      "totalRevenue",
    ];
    for (const col of raffleAmountColumns) {
      await queryInterface.changeColumn("raffles", col, {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: "0",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      "spl_token_send_transactions",
      "creatorAmount",
      {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      }
    );
    await queryInterface.changeColumn(
      "spl_token_send_transactions",
      "commissionAmount",
      {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      }
    );
    await queryInterface.changeColumn(
      "raffle_tickets",
      "creatorAmount",
      {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      }
    );
    const raffleAmountColumns = [
      "totalCommission",
      "claimableAmount",
      "claimedAmount",
      "platformRevenue",
      "totalRevenue",
    ];
    for (const col of raffleAmountColumns) {
      await queryInterface.changeColumn("raffles", col, {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      });
    }
  },
};
