"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add winner selection fields to raffles table
    await queryInterface.addColumn("raffles", "winnersSelected", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.addColumn("raffles", "winnersSelectedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("raffles", "winnerSelectionSeed", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Random seed used for winner selection",
    });

    await queryInterface.addColumn("raffles", "platformWallet", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Platform wallet that holds the rewards",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("raffles", "winnersSelected");
    await queryInterface.removeColumn("raffles", "winnersSelectedAt");
    await queryInterface.removeColumn("raffles", "winnerSelectionSeed");
    await queryInterface.removeColumn("raffles", "platformWallet");
  },
};