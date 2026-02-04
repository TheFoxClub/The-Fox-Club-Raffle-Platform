'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('xp_configs')) {
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
        }
      });

      // Add unique index on configKey
      await queryInterface.addIndex('xp_configs', ['configKey'], {
        name: 'idx_xp_configs_config_key',
        unique: true
      });
    }

    // Insert default configuration values if they don't exist
    const existingConfigs = await queryInterface.sequelize.query(
      'SELECT configKey FROM xp_configs WHERE configKey IN (?, ?, ?)',
      {
        replacements: ['ticket_purchase_rate', 'raffle_revenue_rate', 'raffle_creation_reward'],
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    );

    const existingKeys = existingConfigs.map(config => config.configKey);
    const configsToInsert = [];

    if (!existingKeys.includes('ticket_purchase_rate')) {
      configsToInsert.push({
        configKey: 'ticket_purchase_rate',
        configValue: 1.0000,
        description: 'XP per $1 spent on tickets',
        isActive: true
      });
    }

    if (!existingKeys.includes('raffle_revenue_rate')) {
      configsToInsert.push({
        configKey: 'raffle_revenue_rate',
        configValue: 1.0000,
        description: 'XP per $1 revenue generated from raffles',
        isActive: true
      });
    }

    if (!existingKeys.includes('raffle_creation_reward')) {
      configsToInsert.push({
        configKey: 'raffle_creation_reward',
        configValue: 10.0000,
        description: 'Fixed XP reward for creating a raffle',
        isActive: true
      });
    }

    if (configsToInsert.length > 0) {
      await queryInterface.bulkInsert('xp_configs', configsToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('xp_configs');
  }
};