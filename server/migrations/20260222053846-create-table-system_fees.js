"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("system_fees", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        defaultValue: 1,
      },

      holder_participant_fee: {
        type: Sequelize.DECIMAL(10, 5),
        allowNull: false,
      },

      non_holder_participant_fee: {
        type: Sequelize.DECIMAL(10, 5),
        allowNull: false,
      },

      transaction_fee: {
        type: Sequelize.DECIMAL(10, 5),
        allowNull: false,
      },

      featured_raffle_fee: {
        type: Sequelize.DECIMAL(10, 5),
        allowNull: false,
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

  async down(queryInterface) {
    await queryInterface.dropTable("system_fees");
  },
};
