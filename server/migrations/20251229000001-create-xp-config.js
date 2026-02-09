'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('xp_configs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      configKey: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      configValue: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add unique index on configKey
    await queryInterface.addIndex('xp_configs', ['configKey'], {
      name: 'idx_xp_configs_config_key',
      unique: true
    });

    // Insert default configuration values
    const now = new Date();
    await queryInterface.bulkInsert('xp_configs', [
      {
        configKey: 'ticket_purchase_rate',
        configValue: 1.0000,
        description: 'XP per $1 spent on tickets',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        configKey: 'raffle_revenue_rate',
        configValue: 1.0000,
        description: 'XP per $1 revenue generated from raffles',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        configKey: 'raffle_creation_reward',
        configValue: 10.0000,
        description: 'Fixed XP reward for creating a raffle',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('xp_configs');
  }
};