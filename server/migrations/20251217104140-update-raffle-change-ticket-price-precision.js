"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("raffles", "ticketPrice", {
      type: Sequelize.DECIMAL(18, 8),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("raffles", "ticketPrice", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    });
  },
};
