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
        type: Sequelize.TEXT,
        allowNull: true,
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
      commissionRate: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0.05,
      },
      commissionAmount: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      creatorAmount: {
        type: Sequelize.DECIMAL(10, 9),
        defaultValue: 0,
      },
      isNFTHolder: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      raffleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rewardTransferType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Type of reward transfer: raffle_creation, reward_claim, etc.",
      },
      rewardName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rewardIndex: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Index of reward in the raffle",
      },
      xpProcessed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
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
