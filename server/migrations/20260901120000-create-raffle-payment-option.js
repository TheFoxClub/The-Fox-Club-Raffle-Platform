"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("raffle_payment_options", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      raffleId: { allowNull: false, type: Sequelize.INTEGER, references: { model: "raffles", key: "id" }, onDelete: "CASCADE" },
      tokenAddress: { allowNull: false, type: Sequelize.STRING },
      tokenType: { allowNull: false, type: Sequelize.INTEGER },
      tokenSymbol: { allowNull: false, type: Sequelize.STRING(16) },
      decimals: { allowNull: false, type: Sequelize.INTEGER },
      ticketPrice: { allowNull: false, type: Sequelize.DECIMAL(30, 12) },
      baseSolPrice: { allowNull: false, type: Sequelize.DECIMAL(30, 12) },
      discountPercent: { allowNull: false, type: Sequelize.DECIMAL(8, 4), defaultValue: 0 },
      priceMode: { allowNull: false, type: Sequelize.ENUM("auto", "manual"), defaultValue: "auto" },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex("raffle_payment_options", ["raffleId", "tokenAddress"], { unique: true, name: "raffle_payment_options_raffle_token" });
    await queryInterface.addColumn("ticket_reservations", "paymentOptionId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "raffle_payment_options", key: "id" },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("ticket_reservations", "paymentOptionId");
    await queryInterface.dropTable("raffle_payment_options");
  },
};