"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_airdrop_rewards", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      status: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: "0=PENDING, 1=CLAIMED",
      },
      airdropRewardId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "airdrop_rewards",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      pubKey: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Solana wallet public key of the recipient",
      },
      amount: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: "Calculated as (userXp / totalXp) * totalAmount",
      },
      xp: {
        type: Sequelize.DECIMAL(20, 6),
        allowNull: false,
        defaultValue: 0,
        comment: "User XP used to calculate proportional airdrop amount",
      },
      splTokenTxId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "spl_token_send_transactions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Foreign key to the claim transaction record",
      },
      claimedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("user_airdrop_rewards", ["airdropRewardId"]);
    await queryInterface.addIndex("user_airdrop_rewards", ["pubKey"]);
    await queryInterface.addIndex("user_airdrop_rewards", ["status"]);
    await queryInterface.addIndex("user_airdrop_rewards", ["pubKey", "status"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("user_airdrop_rewards");
  },
};
