'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the index that includes sourceType (if it exists)
    try {
      await queryInterface.removeIndex('xp_tables', 'idx_xp_tables_source_type');
    } catch (error) {
      console.log('Index idx_xp_tables_source_type does not exist, skipping removal');
    }
    
    // Remove the unique composite index that includes sourceType (if it exists)
    try {
      await queryInterface.removeIndex('xp_tables', 'idx_xp_tables_unique_transaction');
    } catch (error) {
      console.log('Index idx_xp_tables_unique_transaction does not exist, skipping removal');
    }
    
    // Remove the sourceType column (if it exists)
    try {
      await queryInterface.removeColumn('xp_tables', 'sourceType');
    } catch (error) {
      console.log('Column sourceType does not exist, skipping removal');
    }
    
    // Recreate the unique composite index without sourceType
    await queryInterface.addIndex('xp_tables', ['userId', 'splTokenSendTransactionId'], {
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
    // Add back the sourceType column
    await queryInterface.addColumn('xp_tables', 'sourceType', {
      type: Sequelize.ENUM('ticket_purchase', 'raffle_revenue', 'raffle_creation'),
      allowNull: false,
      defaultValue: 'ticket_purchase'
    });

    // Remove the simplified unique index
    await queryInterface.removeIndex('xp_tables', 'idx_xp_tables_unique_transaction');
    
    // Add back the sourceType index
    await queryInterface.addIndex('xp_tables', ['sourceType'], {
      name: 'idx_xp_tables_source_type'
    });
    
    // Recreate the original unique composite index with sourceType
    await queryInterface.addIndex('xp_tables', ['userId', 'sourceType', 'splTokenSendTransactionId'], {
      name: 'idx_xp_tables_unique_transaction',
      unique: true,
      where: {
        splTokenSendTransactionId: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  }
};