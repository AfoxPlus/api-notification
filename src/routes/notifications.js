const express = require("express");
const rateLimit = require("express-rate-limit");
const { asyncHandler } = require("../errors");
const { notificationSchema, parseBody } = require("../validation");

function createNotificationRouter({ authenticate, notificationService, rateLimitMax }) {
  const router = express.Router();
  const sendLimiter = rateLimit({
    windowMs: 60_000,
    limit: rateLimitMax,
    keyGenerator: (request) => request.user.uid,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Notification rate limit exceeded." },
  });

  router.post(
    "/send",
    authenticate,
    sendLimiter,
    asyncHandler(async (request, response) => {
      const payload = parseBody(notificationSchema, request.body);
      const result = await notificationService.send(payload);
      response.status(200).json(result);
    }),
  );

  return router;
}

module.exports = { createNotificationRouter };

