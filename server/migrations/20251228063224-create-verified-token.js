"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("verified_tokens", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      symbol: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: "Token symbol (e.g., SOL, USDC, etc.)"
      },
      decimals: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      tokenType: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1, // SPL_TOKEN as default
        comment: "0=SOLANA, 1=SPL_TOKEN, 2=SPL_TOKEN_2022, 3=USDC"
      },
      programId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Token program ID for SPL tokens"
      },
      conversionRate: {
        type: Sequelize.DECIMAL(20, 9),
        allowNull: true,
        comment: "Conversion rate to base currency for pricing"
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isPaymentToken: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this token can be used for ticket payments"
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

    // Insert default payment tokens
    const now = new Date();
    
    await queryInterface.bulkInsert("verified_tokens", [
      // SOL
      {
        address: "So11111111111111111111111111111111111111112",
        name: "Solana",
        symbol: "SOL",
        decimals: 9,
        tokenType: 0, // SOLANA
        programId: null,
        conversionRate: 1.0,
        isVerified: true,
        isPaymentToken: true,
        createdAt: now,
        updatedAt: now,
      },
      // USDC (SPL Token)
      {
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        tokenType: 1, // SPL_TOKEN
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        conversionRate: 1.0, // 1 USDC = 1 base unit for pricing
        isVerified: true,
        isPaymentToken: true,
        createdAt: now,
        updatedAt: now,
      }
    ]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("verified_tokens");
  },
};
