require("dotenv").config();

const pino = require("pino");
const { createApp } = require("./app");
const { loadConfig } = require("./config");
const { createFirebaseServices } = require("./firebase");

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });
const app = createApp({ ...createFirebaseServices(), logger, rateLimitMax: config.NOTIFICATION_RATE_LIMIT_MAX });

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Push notification API listening");
});
