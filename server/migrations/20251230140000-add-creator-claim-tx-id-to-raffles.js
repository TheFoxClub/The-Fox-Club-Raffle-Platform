'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('raffles', 'creatorClaimTxId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'spl_token_send_transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to the transaction record for creator payout claim'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('raffles', 'creatorClaimTxId');
  }
};