"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("airdrop_details", "activationConfig", {
      type: Sequelize.JSON,
      allowNull: true,
      comment:
        "Stores activation-time leaderboard config for creating user_airdrop_rewards when make-claimable is triggered",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("airdrop_details", "activationConfig");
  },
};
