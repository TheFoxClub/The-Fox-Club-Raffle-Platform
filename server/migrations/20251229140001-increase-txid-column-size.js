"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Increase txId column size to handle longer transaction signatures/data
    await queryInterface.changeColumn("spl_token_send_transactions", "txId", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to STRING (VARCHAR(255))
    await queryInterface.changeColumn("spl_token_send_transactions", "txId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};