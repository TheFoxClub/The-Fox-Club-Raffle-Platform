'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('xp_tables', 'configId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'xp_configs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for the new configId field
    await queryInterface.addIndex('xp_tables', ['configId'], {
      name: 'idx_xp_tables_config_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('xp_tables', 'idx_xp_tables_config_id');
    await queryInterface.removeColumn('xp_tables', 'configId');
  }
};