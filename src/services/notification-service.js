const MAX_MULTICAST_TOKENS = 500;
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);
const NOTIFICATION_TITLE = "Alerta de emergencia";

function chunk(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

function createNotificationService({ messaging, userService, logger }) {
  async function dispatchToTokens(tokens, notification, data) {
    let sentCount = 0;
    const invalidTokens = [];

    for (const tokenBatch of chunk(tokens, MAX_MULTICAST_TOKENS)) {
      const result = await messaging.sendEachForMulticast({
        tokens: tokenBatch,
        notification,
        ...(data ? { data } : {}),
      });

      sentCount += result.successCount;
      result.responses.forEach((item, index) => {
        if (!item.success && INVALID_TOKEN_CODES.has(item.error?.code)) {
          invalidTokens.push(tokenBatch[index]);
        }
      });
    }

    return { sentCount, invalidTokens };
  }

  async function sendToPhoneNumber(phoneNumber, notification, data) {
    const recipient = await userService.getRecipientByMobileNumber(phoneNumber);

    if (!recipient) {
      return { phoneNumber, status: "user_not_found", sentCount: 0, removedTokenCount: 0 };
    }

    const tokens = [...new Set(recipient.fcmTokens || [])];

    if (tokens.length === 0) {
      return { phoneNumber, status: "no_tokens", sentCount: 0, removedTokenCount: 0 };
    }

    const { sentCount, invalidTokens } = await dispatchToTokens(tokens, notification, data);
    const removedTokenCount = await userService.removeTokens(recipient.uid, invalidTokens);

    return {
      phoneNumber,
      status: sentCount > 0 ? "sent" : "failed",
      sentCount,
      removedTokenCount,
    };
  }

  async function send({ phoneNumbers, message, coordinates }) {
    const notification = { title: NOTIFICATION_TITLE, body: message };
    const data = { lat: String(coordinates.lat), lng: String(coordinates.lng) };

    const results = await Promise.all(
      phoneNumbers.map((phoneNumber) => sendToPhoneNumber(phoneNumber, notification, data)),
    );

    const attemptedCount = phoneNumbers.length;
    const sentCount = results.reduce((total, result) => total + result.sentCount, 0);
    const removedTokenCount = results.reduce((total, result) => total + result.removedTokenCount, 0);

    logger.info(
      { attemptedCount, sentCount, removedTokenCount, results },
      "Push notification delivery completed",
    );

    return { attemptedCount, sentCount, removedTokenCount, results };
  }

  return { send };
}

module.exports = { createNotificationService, INVALID_TOKEN_CODES, MAX_MULTICAST_TOKENS };

