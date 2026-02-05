'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add foreign key constraints that couldn't be added during table creation due to ordering

    // Add foreign key for raffleId in spl_token_send_transactions
    await queryInterface.addConstraint('spl_token_send_transactions', {
      fields: ['raffleId'],
      type: 'foreign key',
      name: 'fk_spl_token_send_transactions_raffle_id',
      references: {
        table: 'raffles',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add foreign key for creatorClaimTxId in raffles
    await queryInterface.addConstraint('raffles', {
      fields: ['creatorClaimTxId'],
      type: 'foreign key',
      name: 'fk_raffles_creator_claim_tx_id',
      references: {
        table: 'spl_token_send_transactions',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add foreign key for winnerTicketId in raffle_rewards
    await queryInterface.addConstraint('raffle_rewards', {
      fields: ['winnerTicketId'],
      type: 'foreign key',
      name: 'fk_raffle_rewards_winner_ticket_id',
      references: {
        table: 'raffle_tickets',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add foreign key for splTokenTransferTxId in raffle_rewards
    await queryInterface.addConstraint('raffle_rewards', {
      fields: ['splTokenTransferTxId'],
      type: 'foreign key',
      name: 'fk_raffle_rewards_transfer_tx_id',
      references: {
        table: 'spl_token_send_transactions',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add foreign key for splTokenClaimTxId in raffle_rewards
    await queryInterface.addConstraint('raffle_rewards', {
      fields: ['splTokenClaimTxId'],
      type: 'foreign key',
      name: 'fk_raffle_rewards_claim_tx_id',
      references: {
        table: 'spl_token_send_transactions',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraints
    await queryInterface.removeConstraint('spl_token_send_transactions', 'fk_spl_token_send_transactions_raffle_id');
    await queryInterface.removeConstraint('raffles', 'fk_raffles_creator_claim_tx_id');
    await queryInterface.removeConstraint('raffle_rewards', 'fk_raffle_rewards_winner_ticket_id');
    await queryInterface.removeConstraint('raffle_rewards', 'fk_raffle_rewards_transfer_tx_id');
    await queryInterface.removeConstraint('raffle_rewards', 'fk_raffle_rewards_claim_tx_id');
  }
};