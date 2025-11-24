"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("raffle_details", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      raffleId: {
        type: Sequelize.INTEGER,
        references: {
          model: "raffles",
          key: "id",
        },
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      featuredPosition: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Position for featured raffles[1,2,3,...]",
      },
      featuredUntil: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      requiresNftVerification: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verifiedCollectionRequired: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "mint address of the required NFT collection for verification",
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
    await queryInterface.dropTable("raffle_details");
  },
};
