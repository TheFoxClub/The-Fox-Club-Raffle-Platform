const schedule = require("node-schedule");

const {
  checkSplTokenSendTransactions,
} = require("../helpers/solana/read-transactions");
const logger = require("../util/logger");
const {
  checkRaffleAndFeaturedStatus,
} = require("../services/raffles/cron-job");
const TicketReservationService = require("../services/ticket-reservation.service");

const SECONDS_1 = "0/1 * * * * *";
const SECONDS_20 = "*/20 * * * * *";
const MINUTES_1 = "*/59 * * * * *";
const MINUTES_5 = "5/5 * * * *";
const MINUTES_10 = "10/10 * * * *";
const MINUTES_15 = "15/15 * * * *";
const MINUTES_30 = "30/30 * * * *";
const EVERY_HOUR = "20 */1 * * *";
const TWICE_A_DAY_AT_12 = "0 */12 * * *";
const EVERY_MINUTE = "*/1 * * * *";
const EVERY_SIX_HOUR = "0 */6 * * *";

schedule.scheduleJob(SECONDS_20, async () => {
  logger.info("Started Spl Token Send Transactions:");
  await checkSplTokenSendTransactions();
});

schedule.scheduleJob(SECONDS_20, async () => {
  logger.info("Started Raffle & Featured Status Check:");
  await checkRaffleAndFeaturedStatus();
});

schedule.scheduleJob(EVERY_MINUTE, async () => {
  try {
    const cleanedCount = await TicketReservationService.cleanupExpiredReservations();
    if (cleanedCount > 0) {
      logger.info(`Reservation cleanup: cleaned up ${cleanedCount} expired reservations`);
    }
  } catch (error) {
    logger.error('Error in reservation cleanup job:', error);
  }
});
