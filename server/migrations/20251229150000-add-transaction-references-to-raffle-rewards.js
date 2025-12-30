"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add reference to SplTokenSendTransaction for reward transfer (user → platform)
    await queryInterface.addColumn("raffle_rewards", "splTokenTransferTxId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "spl_token_send_transactions",
        key: "id",
      },
      comment: "Reference to transaction when reward was transferred from user to platform",
    });

    // Add reference to SplTokenSendTransaction for claim transfer (platform → user)
    await queryInterface.addColumn("raffle_rewards", "splTokenClaimTxId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "spl_token_send_transactions",
        key: "id",
      },
      comment: "Reference to transaction when reward was claimed by winner",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("raffle_rewards", "splTokenTransferTxId");
    await queryInterface.removeColumn("raffle_rewards", "splTokenClaimTxId");
  },
};