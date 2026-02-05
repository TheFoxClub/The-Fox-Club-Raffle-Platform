"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      pubkey: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      blockchainNetwork: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: "1 -> solana, 2 -> polygon",
      },
      totalXp: {
        type: Sequelize.DECIMAL(18, 6),
        defaultValue: 0,
        allowNull: false
      },
      xpLastUpdated: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
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

    // Add index for XP leaderboard queries
    await queryInterface.addIndex('users', ['totalXp'], {
      name: 'idx_users_total_xp'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");
  },
};
