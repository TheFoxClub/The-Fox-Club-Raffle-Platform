"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Increase claimSignature column size to handle longer transaction data
    await queryInterface.changeColumn("raffle_rewards", "claimSignature", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Also increase transferSignature column size for consistency
    await queryInterface.changeColumn("raffle_rewards", "transferSignature", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to STRING (VARCHAR(255))
    await queryInterface.changeColumn("raffle_rewards", "claimSignature", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("raffle_rewards", "transferSignature", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};