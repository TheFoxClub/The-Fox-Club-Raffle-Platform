"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("system_fees", [
      {
        id: 1,
        holder_participant_fee: 2.5,
        non_holder_participant_fee: 5,
        transaction_fee: 0.001,
        featured_raffle_fee: 0.1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("system_fees", { id: 1 });
  },
};
