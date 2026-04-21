"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("airdrop_details", "imageUrl", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Token image URL for airdrop reward display",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("airdrop_details", "imageUrl");
  },
};
