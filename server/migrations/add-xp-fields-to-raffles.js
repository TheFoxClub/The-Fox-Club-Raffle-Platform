'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('raffles', 'xpAwarded', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // Add index for XP processing queries
    await queryInterface.addIndex('raffles', ['xpAwarded', 'status'], {
      name: 'idx_raffles_xp_awarded'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('raffles', 'idx_raffles_xp_awarded');
    await queryInterface.removeColumn('raffles', 'xpAwarded');
  }
};