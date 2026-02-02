"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to support multi-token payment types
    await queryInterface.addColumn("verified_tokens", "tokenType", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1, // SPL_TOKEN as default
      comment: "0=SOLANA, 1=SPL_TOKEN, 2=SPL_TOKEN_2022, 3=USDC"
    });

    await queryInterface.addColumn("verified_tokens", "symbol", {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: "Token symbol (e.g., SOL, USDC, etc.)"
    });

    await queryInterface.addColumn("verified_tokens", "programId", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Token program ID for SPL tokens"
    });

    await queryInterface.addColumn("verified_tokens", "conversionRate", {
      type: Sequelize.DECIMAL(20, 9),
      allowNull: true,
      comment: "Conversion rate to base currency for pricing"
    });

    await queryInterface.addColumn("verified_tokens", "isPaymentToken", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this token can be used for ticket payments"
    });

    // Insert default payment tokens
    const now = new Date();
    
    // SOL
    await queryInterface.bulkInsert("verified_tokens", [
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
    // Remove the added columns
    await queryInterface.removeColumn("verified_tokens", "tokenType");
    await queryInterface.removeColumn("verified_tokens", "symbol");
    await queryInterface.removeColumn("verified_tokens", "programId");
    await queryInterface.removeColumn("verified_tokens", "conversionRate");
    await queryInterface.removeColumn("verified_tokens", "isPaymentToken");
    
    // Remove the inserted default tokens
    await queryInterface.bulkDelete("verified_tokens", {
      address: {
        [Sequelize.Op.in]: [
          "So11111111111111111111111111111111111111112",
          "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        ]
      }
    });
  },
};