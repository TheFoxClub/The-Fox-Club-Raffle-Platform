"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add reward tracking fields to spl_token_send_transactions table
    await queryInterface.addColumn("spl_token_send_transactions", "raffleId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "raffles",
        key: "id",
      },
    });

    await queryInterface.addColumn("spl_token_send_transactions", "rewardTransferType", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Type of reward transfer: raffle_creation, reward_claim, etc.",
    });

    await queryInterface.addColumn("spl_token_send_transactions", "rewardName", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("spl_token_send_transactions", "rewardIndex", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Index of reward in the raffle",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("spl_token_send_transactions", "raffleId");
    await queryInterface.removeColumn("spl_token_send_transactions", "rewardTransferType");
    await queryInterface.removeColumn("spl_token_send_transactions", "rewardName");
    await queryInterface.removeColumn("spl_token_send_transactions", "rewardIndex");
  },
};