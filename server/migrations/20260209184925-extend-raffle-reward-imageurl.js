"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change imageUrl columns to TEXT to support long IPFS URLs
    await queryInterface.changeColumn("raffle_rewards", "imageUrl", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.changeColumn("raffles", "imageUrl", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to STRING
    await queryInterface.changeColumn("raffle_rewards", "imageUrl", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("raffles", "imageUrl", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
