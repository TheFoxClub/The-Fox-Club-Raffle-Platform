const { Op } = require("sequelize");
const { RAFFLE_STATUS } = require("../../config/data");
const { Raffle, RaffleDetail } = require("../../models");
const logger = require("../../util/logger");
const WinnerSelectionService = require("./winner-selection");
const SocketService = require("../socket.service");

const checkRaffleAndFeaturedStatus = async () => {
  try {
    const currentDate = new Date();
    let changedRaffles = [];
    let changedFeatured = [];
    let winnersSelected = [];

    const allActiveRaffles = await Raffle.findAll({
      include: [
        {
          model: RaffleDetail,
          required: false,
        },
      ],
      where: {
        status: {
          [Op.notIn]: [
            RAFFLE_STATUS.CANCELLED,
            RAFFLE_STATUS.SUSPENDED,
            RAFFLE_STATUS.REFUNDED,
          ],
        },
      },
    });

    for (const raffle of allActiveRaffles) {
      const oldStatus = raffle.status;
      let newStatus = oldStatus;

      if (raffle.ticketsSold >= raffle.totalTickets && raffle.ticketsSold > 0) {
        newStatus = RAFFLE_STATUS.ENDED;

        if (!raffle.endedAt) {
          raffle.endedAt = currentDate;
        }
      } else if (raffle.endedAt && raffle.endedAt < currentDate) {
        // Raffle ended early (already marked as ended)
        newStatus = RAFFLE_STATUS.ENDED;
      } else if (raffle.endDate < currentDate) {
        // Raffle ended at scheduled end date
        newStatus = RAFFLE_STATUS.ENDED;
      } else if (raffle.startDate < currentDate) {
        // Raffle is currently running
        newStatus = RAFFLE_STATUS.LIVE;
      } else {
        // Raffle is upcoming
        newStatus = RAFFLE_STATUS.UPCOMING;
      }

      if (newStatus !== oldStatus && oldStatus !== RAFFLE_STATUS.DRAFT) {
        raffle.status = newStatus;
        await raffle.save();

        const endedEarlyBySoldOut =
          oldStatus !== RAFFLE_STATUS.ENDED &&
          raffle.ticketsSold >= raffle.totalTickets &&
          raffle.ticketsSold > 0;

        changedRaffles.push({
          id: raffle.id,
          title: raffle.title,
          oldStatus: getStatusName(oldStatus),
          newStatus: getStatusName(newStatus),
          startDate: raffle.startDate,
          endDate: raffle.endDate,
          endedAt: raffle.endedAt,
          endedEarly:
            (raffle.endedAt &&
              raffle.endedAt < currentDate &&
              raffle.endDate > currentDate) ||
            endedEarlyBySoldOut,
          ticketsSold: raffle.ticketsSold,
          totalTickets: raffle.totalTickets,
          soldOut: endedEarlyBySoldOut,
        });

        // Emit Socket.IO event for raffle status change
        SocketService.emitRaffleStatusChange(
          raffle.id,
          getStatusName(oldStatus),
          getStatusName(newStatus),
          {
            reason: endedEarlyBySoldOut ? "sold_out" : "scheduled",
            ticketsSold: raffle.ticketsSold,
            totalTickets: raffle.totalTickets,
            endedAt: raffle.endedAt,
            endDate: raffle.endDate,
          }
        );

        // If raffle just ended, select winners
        if (
          newStatus === RAFFLE_STATUS.ENDED &&
          !raffle.winnersSelected &&
          raffle.ticketsSold > 0
        ) {
          try {
            const winnerResult = await WinnerSelectionService.selectWinners(
              raffle.id
            );
            winnersSelected.push({
              raffleId: raffle.id,
              title: raffle.title,
              numberOfWinners: winnerResult.numberOfWinners,
              winners: winnerResult.winners,
            });

            // Emit Socket.IO event for winners selection
            SocketService.emitWinnersSelected(raffle.id, {
              numberOfWinners: winnerResult.numberOfWinners,
              winners: winnerResult.winners,
              selectionSeed: winnerResult.selectionSeed,
              selectedAt: winnerResult.selectedAt,
            });

            logger.info(
              `Winners automatically selected for raffle ${raffle.id}: ${winnerResult.numberOfWinners} winners`
            );
          } catch (winnerError) {
            logger.error(
              `Failed to select winners for raffle ${raffle.id}:`,
              winnerError
            );
          }
        }
      }
    }

    const expiredFeatured = await RaffleDetail.findAll({
      where: {
        featuredUntil: {
          [Op.lt]: currentDate,
          [Op.ne]: null,
        },
        isFeatured: true,
      },
      include: [
        {
          model: Raffle,
          required: true,
        },
      ],
    });

    for (const detail of expiredFeatured) {
      detail.isFeatured = false;
      detail.featuredPosition = null;
      await detail.save();

      changedFeatured.push({
        raffleId: detail.raffleId,
        title: detail.Raffle?.title || "Unknown",
        featuredUntil: detail.featuredUntil,
      });
    }

    if (
      changedRaffles.length > 0 ||
      changedFeatured.length > 0 ||
      winnersSelected.length > 0
    ) {
      logger.info(
        `RAFFLE STATUS CHECK: ${changedRaffles.length} raffle status updates, ${changedFeatured.length} featured status updates, ${winnersSelected.length} winner selections`
      );

      changedRaffles.forEach((raffle) => {
        const logMsg = `Raffle ${raffle.id} (${raffle.title}): ${raffle.oldStatus} → ${raffle.newStatus}`;

        if (raffle.soldOut) {
          logger.info(
            `${logMsg} | SOLD OUT (${raffle.ticketsSold}/${
              raffle.totalTickets
            } tickets sold) | Ended at: ${
              raffle.endedAt?.toISOString() || currentDate.toISOString()
            }`
          );
        } else if (raffle.endedEarly && !raffle.soldOut) {
          logger.info(
            `${logMsg} | ENDED EARLY (manual/other reason) | Ended at: ${raffle.endedAt.toISOString()}`
          );
        } else if (raffle.newStatus === getStatusName(RAFFLE_STATUS.ENDED)) {
          logger.info(
            `${logMsg} | Ended at scheduled time | End date: ${raffle.endDate.toISOString()}`
          );
        } else {
          logger.info(
            `${logMsg} | Start: ${raffle.startDate.toISOString()} | End: ${raffle.endDate.toISOString()}`
          );
        }
      });

      changedFeatured.forEach((featured) => {
        logger.info(
          `Featured expired for raffle id ${
            featured.raffleId
          }  | Was featured until: ${featured.featuredUntil.toISOString()}`
        );
      });

      winnersSelected.forEach((selection) => {
        logger.info(
          `Winners selected for raffle ${selection.raffleId} (${selection.title}): ${selection.numberOfWinners} winners`
        );
        selection.winners.forEach((winner, index) => {
          logger.info(
            `  Winner ${index + 1}: User ${winner.userId} (${
              winner.userPubkey
            }) - Ticket #${winner.ticketNumber} - Reward: ${winner.rewardName}`
          );
        });
      });
    } else {
      logger.info("RAFFLE STATUS CHECK: No changes required.");
    }
  } catch (error) {
    logger.error(`RAFFLE STATUS CHECK: Error in checkRaffleStatus:`, error);
    return;
  }
};

function getStatusName(statusCode) {
  const statusMap = {
    [RAFFLE_STATUS.DRAFT]: "DRAFT",
    [RAFFLE_STATUS.UPCOMING]: "UPCOMING",
    [RAFFLE_STATUS.LIVE]: "LIVE",
    [RAFFLE_STATUS.ENDED]: "ENDED",
    [RAFFLE_STATUS.CANCELLED]: "CANCELLED",
    [RAFFLE_STATUS.SUSPENDED]: "SUSPENDED",
  };
  return statusMap[statusCode] || `UNKNOWN(${statusCode})`;
}

module.exports = { checkRaffleAndFeaturedStatus };
