'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('xp_tables', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sourceType: {
        type: Sequelize.ENUM('ticket_purchase', 'raffle_revenue', 'raffle_creation'),
        allowNull: false
      },
      splTokenSendTransactionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'spl_token_send_transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      raffleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'raffles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      configId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'xp_configs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      usdValue: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0
      },
      xpEarned: {
        type: Sequelize.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 0
      },
      tokenType: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'From TOKEN_TYPE enum: 0=SOLANA, 1=SPL_TOKEN, 2=SPL_TOKEN_2022, 3=USDC'
      },
      tokenAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      rawTokenAmount: {
        type: Sequelize.DECIMAL(18, 9),
        allowNull: true,
        comment: 'Original token amount before USD conversion'
      },
      conversionRate: {
        type: Sequelize.DECIMAL(20, 9),
        allowNull: true,
        comment: 'Token to USD rate used for conversion'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional context like ticket count, raffle title, etc.'
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

    // Add indexes for better query performance
    await queryInterface.addIndex('xp_tables', ['userId'], {
      name: 'idx_xp_tables_user_id'
    });
    
    await queryInterface.addIndex('xp_tables', ['sourceType'], {
      name: 'idx_xp_tables_source_type'
    });
    
    await queryInterface.addIndex('xp_tables', ['splTokenSendTransactionId'], {
      name: 'idx_xp_tables_spl_transaction_id'
    });
    
    await queryInterface.addIndex('xp_tables', ['raffleId'], {
      name: 'idx_xp_tables_raffle_id'
    });

    await queryInterface.addIndex('xp_tables', ['configId'], {
      name: 'idx_xp_tables_config_id'
    });

    // Composite index for preventing duplicates
    await queryInterface.addIndex('xp_tables', ['userId', 'sourceType', 'splTokenSendTransactionId'], {
      name: 'idx_xp_tables_unique_transaction',
      unique: true,
      where: {
        splTokenSendTransactionId: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('xp_tables');
  }
};