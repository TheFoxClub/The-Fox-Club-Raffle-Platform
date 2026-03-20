"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("airdrop_details", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      airdropName: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      type: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: "0=SOL, 1=SPL_TOKEN, 2=SPL_TOKEN_2022",
      },
      tokenAddress: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "Mint address for SPL tokens, null for SOL",
      },
      tokenDecimals: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 9,
      },
      tokenSymbol: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      totalAmount: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: "2=FUNDED, 3=ACTIVE, 4=COMPLETED, 5=CANCELLED",
      },
      airdropWallet: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "Platform wallet that holds the airdrop funds",
      },
      splTokenSendTxId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "spl_token_send_transactions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Foreign key to spl_token_send_transactions.id for funding transfer",
      },
      creatorUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("airdrop_details", ["status"]);
    await queryInterface.addIndex("airdrop_details", ["splTokenSendTxId"]);
    await queryInterface.addIndex("airdrop_details", ["startDate"]);
    await queryInterface.addIndex("airdrop_details", ["endDate"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("airdrop_details");
  },
};
