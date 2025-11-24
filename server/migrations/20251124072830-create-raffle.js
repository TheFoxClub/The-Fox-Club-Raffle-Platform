"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("raffles", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      totalTickets: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ticketPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      ticketsSold: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      tokenType: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "1 - SOL, 2 - USDC, 3 - mint address",
      },
      numberOfWinners: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment:
          "0 - upcoming, 1 - live, 2 - ended, 3 - cancelled, 4 - suspended",
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
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("raffles");
  },
};
