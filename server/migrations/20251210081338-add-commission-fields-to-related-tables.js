"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("raffles", "totalCommission", {
      type: Sequelize.DECIMAL(10, 9),
      defaultValue: 0,
    });

    await queryInterface.addColumn("raffles", "claimableAmount", {
      type: Sequelize.DECIMAL(10, 9),
      defaultValue: 0,
    });

    await queryInterface.addColumn("raffles", "claimedAmount", {
      type: Sequelize.DECIMAL(10, 9),
      defaultValue: 0,
    });

    await queryInterface.addColumn("raffles", "platformRevenue", {
      type: Sequelize.DECIMAL(10, 9),
      defaultValue: 0,
    });

    await queryInterface.addColumn("raffles", "totalRevenue", {
      type: Sequelize.DECIMAL(10, 9),
      defaultValue: 0,
    });

    // Add fields to spl_token_send_transactions table
    await queryInterface.addColumn(
      "spl_token_send_transactions",
      "commissionRate",
      {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0.05,
      }
    );

    await queryInterface.addColumn(
      "spl_token_send_transactions",
      "commissionAmount",
      {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      }
    );

    await queryInterface.addColumn(
      "spl_token_send_transactions",
      "creatorAmount",
      {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      }
    );

    await queryInterface.addColumn(
      "spl_token_send_transactions",
      "isNFTHolder",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }
    );

    // Add fields to raffle_tickets table
    await queryInterface.addColumn("raffle_tickets", "commissionRate", {
      type: Sequelize.DECIMAL(10, 4),
      defaultValue: 0.05,
    });

    await queryInterface.addColumn("raffle_tickets", "creatorAmount", {
      type: Sequelize.DECIMAL(10, 9),
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("raffles", "totalCommission");
    await queryInterface.removeColumn("raffles", "claimableAmount");
    await queryInterface.removeColumn("raffles", "claimedAmount");
    await queryInterface.removeColumn("raffles", "platformRevenue");
    await queryInterface.removeColumn("raffles", "totalRevenue");

    await queryInterface.removeColumn(
      "spl_token_send_transactions",
      "commissionRate"
    );
    await queryInterface.removeColumn(
      "spl_token_send_transactions",
      "commissionAmount"
    );
    await queryInterface.removeColumn(
      "spl_token_send_transactions",
      "creatorAmount"
    );
    await queryInterface.removeColumn(
      "spl_token_send_transactions",
      "isNFTHolder"
    );

    await queryInterface.removeColumn("raffle_tickets", "commissionRate");
    await queryInterface.removeColumn("raffle_tickets", "creatorAmount");
  },
};
