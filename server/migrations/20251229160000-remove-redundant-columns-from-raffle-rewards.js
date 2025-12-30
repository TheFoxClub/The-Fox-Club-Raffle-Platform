"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove redundant columns that are now tracked via SplTokenSendTransaction associations
    await queryInterface.removeColumn("raffle_rewards", "claimedAt");
    await queryInterface.removeColumn("raffle_rewards", "claimSignature");
    await queryInterface.removeColumn("raffle_rewards", "transferSignature");
    await queryInterface.removeColumn("raffle_rewards", "senderWallet");
    await queryInterface.removeColumn("raffle_rewards", "receiverWallet");
    await queryInterface.removeColumn("raffle_rewards", "transferredAt");
    await queryInterface.removeColumn("raffle_rewards", "transferDirection");
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the columns if we need to rollback
    await queryInterface.addColumn("raffle_rewards", "claimedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "claimSignature", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "transferSignature", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "senderWallet", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "receiverWallet", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "transferredAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "transferDirection", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "to_platform, to_winner",
    });
  },
};