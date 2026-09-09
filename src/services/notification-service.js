const { AppError } = require("../errors");

const MAX_MULTICAST_TOKENS = 500;
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function chunk(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

function createNotificationService({ messaging, userService, logger }) {
  async function send({ toUserId, title, body, data }) {
    const recipient = await userService.getRecipient(toUserId);
    const tokens = [...new Set(recipient.fcmTokens || [])];

    if (tokens.length === 0) {
      throw new AppError(409, "Recipient has no registered device tokens.");
    }

    let sentCount = 0;
    const invalidTokens = [];

    for (const tokenBatch of chunk(tokens, MAX_MULTICAST_TOKENS)) {
      const result = await messaging.sendEachForMulticast({
        tokens: tokenBatch,
        notification: { title, body },
        ...(data ? { data } : {}),
      });

      sentCount += result.successCount;
      result.responses.forEach((item, index) => {
        if (!item.success && INVALID_TOKEN_CODES.has(item.error?.code)) {
          invalidTokens.push(tokenBatch[index]);
        }
      });
    }

    const removedTokenCount = await userService.removeTokens(toUserId, invalidTokens);
    logger.info(
      { toUserId, attemptedCount: tokens.length, sentCount, removedTokenCount },
      "Push notification delivery completed",
    );

    return { attemptedCount: tokens.length, sentCount, removedTokenCount };
  }

  return { send };
}

module.exports = { createNotificationService, INVALID_TOKEN_CODES, MAX_MULTICAST_TOKENS };

