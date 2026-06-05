const { default: axios } = require("axios");
const logger = require("../util/logger");
const {
  DISCORD_RAFFLE_WEBHOOK_URL,
  DISCORD_RAFFLE_WEBHOOK_USERNAME,
  DISCORD_RAFFLE_WEBHOOK_AVATAR_URL,
  PUBLIC_APP_URL,
} = require("../config/credentials");

const EMBED_COLOR = 0xf59e0b;
const REMINDER_WINDOW_MS = 60 * 60 * 1000;
const FOOTER_TEXT = "Powered by The Fox Club";

const truncate = (value, maxLength) => {
  if (!value) {
    return "";
  }

  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}...`
    : value;
};

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/$/, "");
};

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value || "");

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) {
    return "";
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);

  if (!resolvedBaseUrl) {
    return "";
  }

  return `${resolvedBaseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
};

const formatRewardSummary = (rewards = []) => {
  if (!Array.isArray(rewards) || rewards.length === 0) {
    return "No rewards listed";
  }

  const summary = rewards
    .slice(0, 4)
    .map((reward) => {
      const amount = reward.amount && Number(reward.amount) > 1
        ? `${reward.amount}x `
        : "";
      return `- ${amount}${reward.rewardName || "Reward"}`;
    })
    .join("\n");

  return rewards.length > 4 ? `${summary}\n- +${rewards.length - 4} more` : summary;
};

const buildFields = (raffle, creatorPubkey) => {
  const fields = [
    {
      name: "Ticket Price",
      value: `${raffle.ticketPrice} ${raffle.tokenType || "SOLANA"}`,
      inline: true,
    },
    {
      name: "Tickets",
      value: `${raffle.ticketsSold || 0}/${raffle.totalTickets || 0}`,
      inline: true,
    },
    {
      name: "Winners",
      value: String(raffle.numberOfWinners || 1),
      inline: true,
    },
    {
      name: "Starts",
      value: formatDate(raffle.startDate),
      inline: true,
    },
    {
      name: "Ends",
      value: formatDate(raffle.endDate),
      inline: true,
    },
    {
      name: "Status",
      value: String(raffle.status || "UPCOMING"),
      inline: true,
    },
    {
      name: "Rewards",
      value: truncate(formatRewardSummary(raffle.raffle_rewards), 1024),
      inline: false,
    },
  ];

  if (creatorPubkey) {
    fields.push({
      name: "Creator",
      value: truncate(creatorPubkey, 1024),
      inline: false,
    });
  }

  return fields;
};

const buildEmbed = ({
  raffle,
  origin,
  creatorPubkey,
  description,
}) => {
  const baseUrl = normalizeBaseUrl(origin) || normalizeBaseUrl(PUBLIC_APP_URL);
  const raffleUrl = baseUrl ? `${baseUrl}/raffle/raffle-${raffle.id}` : undefined;
  const imageUrl = toAbsoluteUrl(
    raffle.imageUrl || raffle.raffle_rewards?.[0]?.imageUrl,
    baseUrl,
  );

  return {
    title: truncate(raffle.title || `Raffle #${raffle.id}`, 256),
    url: raffleUrl,
    description: truncate(description, 4096),
    color: EMBED_COLOR,
    fields: buildFields(raffle, creatorPubkey),
    image: imageUrl ? { url: imageUrl } : undefined,
    footer: {
      text: FOOTER_TEXT,
      icon_url: DISCORD_RAFFLE_WEBHOOK_AVATAR_URL || undefined,
    },
    timestamp: new Date().toISOString(),
  };
};

const sendDiscordWebhook = async (embed) => {
  await axios.post(
    DISCORD_RAFFLE_WEBHOOK_URL,
    {
      username: DISCORD_RAFFLE_WEBHOOK_USERNAME,
      avatar_url: DISCORD_RAFFLE_WEBHOOK_AVATAR_URL || undefined,
      embeds: [embed],
    },
    {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};

async function sendRaffleCreatedNotification({ raffle, origin, creatorPubkey }) {
  if (!DISCORD_RAFFLE_WEBHOOK_URL || !raffle) {
    return false;
  }

  await sendDiscordWebhook(
    buildEmbed({
      raffle,
      origin,
      creatorPubkey,
      description: raffle.description || "A new raffle is now live on FoxClub.",
    }),
  );

  logger.info(`Discord raffle webhook sent for raffle ${raffle.id}`);
  return true;
}

async function sendRaffleEndingSoonNotification({
  raffle,
  origin,
  creatorPubkey,
}) {
  if (!DISCORD_RAFFLE_WEBHOOK_URL || !raffle || !raffle.endDate) {
    return false;
  }

  const msUntilEnd = new Date(raffle.endDate).getTime() - Date.now();

  if (msUntilEnd <= 0 || msUntilEnd > REMINDER_WINDOW_MS) {
    return false;
  }

  await sendDiscordWebhook(
    buildEmbed({
      raffle,
      origin,
      creatorPubkey,
      description:
        raffle.description ||
        "Reminder: this raffle is ending in about 1 hour on FoxClub.",
    }),
  );

  logger.info(`Discord raffle reminder sent for raffle ${raffle.id}`);
  return true;
}

module.exports = {
  sendRaffleCreatedNotification,
  sendRaffleEndingSoonNotification,
};