const { TicketReservation, Raffle, User, sequelize } = require("../models");
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require("../util/logger");
const { TICKET_RESERVATION_STATUS } = require("../config/data");

class TicketReservationService {
  /**
   * Reserve tickets atomically with database-level locking
   * @param {Object} params
   * @param {number} params.raffleId - Raffle ID
   * @param {number} params.userId - User ID  
   * @param {string} params.walletAddress - User wallet address
   * @param {number} params.ticketCount - Number of tickets to reserve
   * @param {number} params.reservationTimeoutSeconds - Reservation timeout (default: 60)
   * @returns {Promise<Object>} Reservation result
   */
  static async reserveTickets({ 
    raffleId, 
    userId, 
    walletAddress, 
    ticketCount, 
    reservationTimeoutSeconds = 60 
  }) {
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Clean up expired reservations first
      await this.cleanupExpiredReservations(raffleId, transaction);

      // 2. Check for existing active reservation for this wallet
      const existingReservation = await TicketReservation.findOne({
        where: {
          raffleId,
          walletAddress,
          status: TICKET_RESERVATION_STATUS.RESERVED,
          expiresAt: { [Op.gt]: new Date() }
        },
        transaction
      });

      if (existingReservation) {
        await transaction.rollback();
        return {
          success: false,
          error: 'EXISTING_RESERVATION',
          message: 'You already have an active ticket reservation',
          reservationId: existingReservation.reservationId,
          expiresAt: existingReservation.expiresAt
        };
      }

      // 3. Lock raffle row for update (prevents concurrent modifications)
      const raffle = await Raffle.findOne({
        where: { id: raffleId },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!raffle) {
        await transaction.rollback();
        return {
          success: false,
          error: 'RAFFLE_NOT_FOUND',
          message: 'Raffle not found'
        };
      }

      // 4. Calculate current reserved + sold tickets
      const activeReservations = await TicketReservation.sum('ticketCount', {
        where: {
          raffleId,
          status: TICKET_RESERVATION_STATUS.RESERVED,
          expiresAt: { [Op.gt]: new Date() }
        },
        transaction
      }) || 0;

      const totalCommitted = raffle.ticketsSold + activeReservations;
      const availableTickets = raffle.totalTickets - totalCommitted;

      // 5. Check if enough tickets are available
      if (ticketCount > availableTickets) {
        await transaction.rollback();
        return {
          success: false,
          error: 'INSUFFICIENT_TICKETS',
          message: `Only ${availableTickets} tickets available`,
          availableTickets,
          requestedTickets: ticketCount
        };
      }

      // 6. Create reservation
      const reservationId = uuidv4();
      const expiresAt = new Date(Date.now() + (reservationTimeoutSeconds * 1000));

      const reservation = await TicketReservation.create({
        raffleId,
        userId,
        walletAddress,
        ticketCount,
        reservationId,
        status: TICKET_RESERVATION_STATUS.RESERVED,
        expiresAt
      }, { transaction });

      await transaction.commit();

      logger.info(`Tickets reserved: ${ticketCount} for wallet ${walletAddress} in raffle ${raffleId}`);

      return {
        success: true,
        reservation: {
          reservationId,
          ticketCount,
          expiresAt,
          timeoutSeconds: reservationTimeoutSeconds
        }
      };

    } catch (error) {
      await transaction.rollback();
      logger.error('Error reserving tickets:', error);
      return {
        success: false,
        error: 'RESERVATION_FAILED',
        message: 'Failed to reserve tickets'
      };
    }
  }

  /**
   * Confirm reservation after successful transaction
   * @param {string} reservationId - Reservation ID
   * @param {string} transactionSignature - Solana transaction signature
   * @returns {Promise<Object>} Confirmation result
   */
  static async confirmReservation(reservationId, transactionSignature) {
    const transaction = await sequelize.transaction();

    try {
      const reservation = await TicketReservation.findOne({
        where: { 
          reservationId,
          status: TICKET_RESERVATION_STATUS.RESERVED
        },
        transaction
      });

      if (!reservation) {
        await transaction.rollback();
        return {
          success: false,
          error: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found or already processed'
        };
      }

      // Check if reservation has expired
      if (new Date() > reservation.expiresAt) {
        await reservation.update({ status: TICKET_RESERVATION_STATUS.EXPIRED }, { transaction });
        await transaction.rollback();
        return {
          success: false,
          error: 'RESERVATION_EXPIRED',
          message: 'Reservation has expired'
        };
      }

      // Update reservation status
      await reservation.update({
        status: TICKET_RESERVATION_STATUS.CONFIRMED,
        transactionSignature
      }, { transaction });

      await transaction.commit();

      logger.info(`Reservation confirmed: ${reservationId} with tx ${transactionSignature}`);

      return {
        success: true,
        reservation
      };

    } catch (error) {
      await transaction.rollback();
      logger.error('Error confirming reservation:', error);
      return {
        success: false,
        error: 'CONFIRMATION_FAILED',
        message: 'Failed to confirm reservation'
      };
    }
  }

  /**
   * Cancel reservation
   * @param {string} reservationId - Reservation ID
   * @returns {Promise<Object>} Cancellation result
   */
  static async cancelReservation(reservationId) {
    try {
      const reservation = await TicketReservation.findOne({
        where: { 
          reservationId,
          status: TICKET_RESERVATION_STATUS.RESERVED
        }
      });

      if (!reservation) {
        return {
          success: false,
          error: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found'
        };
      }

      await reservation.update({ status: TICKET_RESERVATION_STATUS.CANCELLED });

      logger.info(`Reservation cancelled: ${reservationId}`);

      return { success: true };

    } catch (error) {
      logger.error('Error cancelling reservation:', error);
      return {
        success: false,
        error: 'CANCELLATION_FAILED',
        message: 'Failed to cancel reservation'
      };
    }
  }

  /**
   * Clean up expired reservations
   * @param {number} raffleId - Raffle ID (optional)
   * @param {Object} transaction - Database transaction (optional)
   */
  static async cleanupExpiredReservations(raffleId = null, transaction = null) {
    try {
      const whereClause = {
        status: TICKET_RESERVATION_STATUS.RESERVED,
        expiresAt: { [Op.lt]: new Date() }
      };

      if (raffleId) {
        whereClause.raffleId = raffleId;
      }

      const expiredCount = await TicketReservation.update(
        { status: TICKET_RESERVATION_STATUS.EXPIRED },
        { 
          where: whereClause,
          transaction
        }
      );

      if (expiredCount[0] > 0) {
        logger.info(`Cleaned up ${expiredCount[0]} expired reservations`);
      }

      return expiredCount[0];

    } catch (error) {
      logger.error('Error cleaning up expired reservations:', error);
      return 0;
    }
  }

  /**
   * Get reservation status
   * @param {string} reservationId - Reservation ID
   * @returns {Promise<Object>} Reservation status
   */
  static async getReservationStatus(reservationId) {
    try {
      const reservation = await TicketReservation.findOne({
        where: { reservationId },
        include: [
          { model: Raffle, attributes: ['id', 'title'] },
          { model: User, attributes: ['id', 'pubkey'] }
        ]
      });

      if (!reservation) {
        return {
          success: false,
          error: 'RESERVATION_NOT_FOUND',
          message: 'Reservation not found'
        };
      }

      return {
        success: true,
        reservation: {
          id: reservation.reservationId,
          status: Object.keys(TICKET_RESERVATION_STATUS).find(key => 
            TICKET_RESERVATION_STATUS[key] === reservation.status
          ) || reservation.status,
          ticketCount: reservation.ticketCount,
          expiresAt: reservation.expiresAt,
          isExpired: new Date() > reservation.expiresAt,
          transactionSignature: reservation.transactionSignature,
          raffle: reservation.raffle,
          createdAt: reservation.createdAt
        }
      };

    } catch (error) {
      logger.error('Error getting reservation status:', error);
      return {
        success: false,
        error: 'STATUS_CHECK_FAILED',
        message: 'Failed to check reservation status'
      };
    }
  }

  /**
   * Get available tickets for a raffle (considering active reservations)
   * @param {number} raffleId - Raffle ID
   * @returns {Promise<number>} Available ticket count
   */
  static async getAvailableTickets(raffleId) {
    try {
      // Clean up expired reservations first
      await this.cleanupExpiredReservations(raffleId);

      const raffle = await Raffle.findByPk(raffleId);
      if (!raffle) return 0;

      const activeReservations = await TicketReservation.sum('ticketCount', {
        where: {
          raffleId,
          status: TICKET_RESERVATION_STATUS.RESERVED,
          expiresAt: { [Op.gt]: new Date() }
        }
      }) || 0;

      const availableTickets = raffle.totalTickets - raffle.ticketsSold - activeReservations;
      return Math.max(0, availableTickets);

    } catch (error) {
      logger.error('Error getting available tickets:', error);
      return 0;
    }
  }
}

module.exports = TicketReservationService;