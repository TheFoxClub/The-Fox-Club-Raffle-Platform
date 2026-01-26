'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_reservations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      raffleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'raffles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      walletAddress: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ticketCount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      reservationId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: "1-> reserved, 2-> confirmed, 3->expired, 4->cancelled"
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      transactionSignature: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('ticket_reservations', ['raffleId', 'walletAddress']);
    await queryInterface.addIndex('ticket_reservations', ['status', 'expiresAt']);
    await queryInterface.addIndex('ticket_reservations', ['reservationId'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ticket_reservations');
  }
};