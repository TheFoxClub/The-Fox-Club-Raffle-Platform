const path = require("path");
const winston = require("winston");
require("winston-daily-rotate-file");

const createTransport = (level) => {
  return new winston.transports.DailyRotateFile({
    filename: path.join("logs", `${level}-%DATE%.log`),
    datePattern: "YYYY-ww",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "3d",
    level: level,
  });
};

const errorTransport = createTransport("error");
const warnTransport = createTransport("warn");
const infoTransport = createTransport("info");
const debugTransport = createTransport("debug");

const logFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.prettyPrint(),
  winston.format.timestamp(),
  winston.format.printf((info) => {
    if (info.level === "error") {
      return `[${info.level}] ${info.timestamp} - ${info.message}\n${
        info.stack || ""
      }\n`;
    } else {
      return `${info.timestamp} - ${info.message}`;
    }
  })
);

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  transports: [errorTransport, warnTransport, infoTransport, debugTransport],
  format: logFormat,
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console());
}

module.exports = logger;
