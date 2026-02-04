'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.totalXp) {
      await queryInterface.addColumn('users', 'totalXp', {
        type: Sequelize.DECIMAL(18, 6),
        defaultValue: 0,
        allowNull: false
      });
    }

    if (!tableDescription.xpLastUpdated) {
      await queryInterface.addColumn('users', 'xpLastUpdated', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      });
    }

    // Add index for XP leaderboard queries if it doesn't exist
    try {
      await queryInterface.addIndex('users', ['totalXp'], {
        name: 'idx_users_total_xp'
      });
    } catch (error) {
      // Index might already exist, ignore error
      console.log('Index idx_users_total_xp might already exist');
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('users', 'idx_users_total_xp');
    } catch (error) {
      // Index might not exist, ignore error
    }
    
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.totalXp) {
      await queryInterface.removeColumn('users', 'totalXp');
    }
    
    if (tableDescription.xpLastUpdated) {
      await queryInterface.removeColumn('users', 'xpLastUpdated');
    }
  }
};