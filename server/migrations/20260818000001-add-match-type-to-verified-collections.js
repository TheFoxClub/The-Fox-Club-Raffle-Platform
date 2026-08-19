"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("verified_collections", "matchType", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "collection",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("verified_collections", "matchType");
  },
};