const {
  createNotificationService,
  MAX_MULTICAST_TOKENS,
} = require("../src/services/notification-service");

describe("notification service", () => {
  test("batches multicast sends and removes only invalid FCM tokens", async () => {
    const tokens = Array.from({ length: MAX_MULTICAST_TOKENS + 1 }, (_, index) => `token-${index}`);
    const messaging = {
      sendEachForMulticast: jest
        .fn()
        .mockResolvedValueOnce({
          successCount: MAX_MULTICAST_TOKENS - 1,
          responses: [
            ...Array.from({ length: MAX_MULTICAST_TOKENS - 1 }, () => ({ success: true })),
            {
              success: false,
              error: { code: "messaging/registration-token-not-registered" },
            },
          ],
        })
        .mockResolvedValueOnce({
          successCount: 0,
          responses: [{ success: false, error: { code: "messaging/unavailable" } }],
        }),
    };
    const userService = {
      getRecipient: jest.fn().mockResolvedValue({ fcmTokens: tokens }),
      removeTokens: jest.fn().mockResolvedValue(1),
    };
    const logger = { info: jest.fn() };
    const service = createNotificationService({ messaging, userService, logger });

    await expect(
      service.send({
        toUserId: "recipient",
        title: "New message",
        body: "Message body",
        data: { chatId: "123" },
      }),
    ).resolves.toEqual({
      attemptedCount: MAX_MULTICAST_TOKENS + 1,
      sentCount: MAX_MULTICAST_TOKENS - 1,
      removedTokenCount: 1,
    });

    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(userService.removeTokens).toHaveBeenCalledWith("recipient", [`token-${MAX_MULTICAST_TOKENS - 1}`]);
  });

  test("does not send when the recipient has no registered tokens", async () => {
    const userService = {
      getRecipient: jest.fn().mockResolvedValue({ fcmTokens: [] }),
      removeTokens: jest.fn(),
    };
    const messaging = { sendEachForMulticast: jest.fn() };
    const service = createNotificationService({
      messaging,
      userService,
      logger: { info: jest.fn() },
    });

    await expect(
      service.send({ toUserId: "recipient", title: "Title", body: "Body" }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });
});

