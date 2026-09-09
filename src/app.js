const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const swaggerUi = require("swagger-ui-express");
const { createAuthenticate } = require("./middleware/authenticate");
const { createErrorHandler } = require("./middleware/error-handler");
const { createNotificationRouter } = require("./routes/notifications");
const { createTokenRouter } = require("./routes/tokens");
const { createNotificationService } = require("./services/notification-service");
const { createUserService } = require("./services/user-service");
const { openapiDocument } = require("./openapi");

function createApp({ auth, firestore, messaging, logger, rateLimitMax = 30 }) {
  const app = express();
  const appLogger = logger || pino();
  const authenticate = createAuthenticate(auth);
  const userService = createUserService(firestore);
  const notificationService = createNotificationService({
    messaging,
    userService,
    logger: appLogger,
  });

  app.use(pinoHttp({ logger: appLogger }));
  app.use(express.json({ limit: "32kb" }));

  app.get("/api-docs.json", (_request, response) => {
    response.status(200).json(openapiDocument);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/api/tokens", createTokenRouter({ authenticate, userService }));
  app.use(
    "/api/notifications",
    createNotificationRouter({ authenticate, notificationService, rateLimitMax }),
  );
  app.use(createErrorHandler(appLogger));

  return app;
}

module.exports = { createApp };
