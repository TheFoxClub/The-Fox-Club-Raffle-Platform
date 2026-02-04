'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('spl_token_send_transactions', 'xpProcessed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add index for XP processing queries
    await queryInterface.addIndex('spl_token_send_transactions', ['xpProcessed', 'status'], {
      name: 'idx_spl_transactions_xp_processed'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('spl_token_send_transactions', 'idx_spl_transactions_xp_processed');
    await queryInterface.removeColumn('spl_token_send_transactions', 'xpProcessed');
  }
};