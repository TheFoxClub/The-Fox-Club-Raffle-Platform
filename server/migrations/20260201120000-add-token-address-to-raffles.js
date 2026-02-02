'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('raffles', 'tokenAddress', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'The specific token address for payment (for SPL tokens)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('raffles', 'tokenAddress');
  }
};