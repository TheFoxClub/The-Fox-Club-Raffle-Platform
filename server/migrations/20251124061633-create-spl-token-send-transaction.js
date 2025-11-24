"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("spl_token_send_transactions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      type: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      senderPubkey: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      receiverPubkey: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      txId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tokenAddress: {
        type: Sequelize.STRING,
      },
      decimals: {
        type: Sequelize.INTEGER,
        defaultValue: 9,
      },
      uiAmount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      additionalJson: {
        type: Sequelize.JSON,
        allowNull: true,
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
    await queryInterface.dropTable("spl_token_send_transactions");
  },
};
