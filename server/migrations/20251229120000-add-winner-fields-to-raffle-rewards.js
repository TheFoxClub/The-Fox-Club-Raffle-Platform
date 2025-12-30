"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add winner-related fields to raffle_rewards table
    await queryInterface.addColumn("raffle_rewards", "winnerId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    });

    await queryInterface.addColumn("raffle_rewards", "winnerTicketId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "raffle_tickets",
        key: "id",
      },
    });

    await queryInterface.addColumn("raffle_rewards", "isClaimed", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.addColumn("raffle_rewards", "claimedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("raffle_rewards", "claimSignature", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Add transfer tracking fields
    await queryInterface.addColumn("raffle_rewards", "transferSignature", {
      type: Sequelize.STRING,
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("raffle_rewards", "winnerId");
    await queryInterface.removeColumn("raffle_rewards", "winnerTicketId");
    await queryInterface.removeColumn("raffle_rewards", "isClaimed");
    await queryInterface.removeColumn("raffle_rewards", "claimedAt");
    await queryInterface.removeColumn("raffle_rewards", "claimSignature");
    await queryInterface.removeColumn("raffle_rewards", "transferSignature");
    await queryInterface.removeColumn("raffle_rewards", "senderWallet");
    await queryInterface.removeColumn("raffle_rewards", "receiverWallet");
    await queryInterface.removeColumn("raffle_rewards", "transferredAt");
    await queryInterface.removeColumn("raffle_rewards", "transferDirection");
  },
};