"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("xp_tables", "rawTokenAmount", {
      type: Sequelize.DECIMAL(27, 9),
      allowNull: true,
      comment: "Original token amount before USD conversion",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("xp_tables", "rawTokenAmount", {
      type: Sequelize.DECIMAL(18, 9),
      allowNull: true,
      comment: "Original token amount before USD conversion",
    });
  },
};
