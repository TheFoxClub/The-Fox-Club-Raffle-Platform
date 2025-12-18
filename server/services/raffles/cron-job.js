const { Op } = require("sequelize");
const { RAFFLE_STATUS } = require("../../config/data");
const { Raffle, RaffleDetail } = require("../../models");
const logger = require("../../util/logger");

const checkRaffleAndFeaturedStatus = async () => {
  try {
    const currentDate = new Date();
    let changedRaffles = [];
    let changedFeatured = [];

    const allActiveRaffles = await Raffle.findAll({
      include: [
        {
          model: RaffleDetail,
          required: false,
        },
      ],
      where: {
        status: {
          [Op.notIn]: [RAFFLE_STATUS.CANCELLED, RAFFLE_STATUS.SUSPENDED],
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

    if (changedRaffles.length > 0 || changedFeatured.length > 0) {
      logger.info(
        `RAFFLE STATUS CHECK: ${changedRaffles.length} raffle status updates, ${changedFeatured.length} featured status updates`
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
