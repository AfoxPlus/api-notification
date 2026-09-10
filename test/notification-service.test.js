const {
  createNotificationService,
  MAX_MULTICAST_TOKENS,
} = require("../src/services/notification-service");

describe("notification service", () => {
  test("sends to each phone number and reports per-number status", async () => {
    const messaging = {
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        responses: [{ success: true }],
      }),
    };
    const userService = {
      getRecipientByMobileNumber: jest.fn((phoneNumber) => {
        if (phoneNumber === "+51900000001") {
          return Promise.resolve({ uid: "user-1", fcmTokens: ["token-1"] });
        }
        if (phoneNumber === "+51900000002") {
          return Promise.resolve({ uid: "user-2", fcmTokens: [] });
        }
        return Promise.resolve(null);
      }),
      removeTokens: jest.fn().mockResolvedValue(0),
    };
    const logger = { info: jest.fn() };
    const service = createNotificationService({ messaging, userService, logger });

    const result = await service.send({
      phoneNumbers: ["+51900000001", "+51900000002", "+51900000003"],
      message: "Se reporta una emergencia",
      coordinates: { lat: -12.05, lng: -77.04 },
    });

    expect(result).toEqual({
      attemptedCount: 3,
      sentCount: 1,
      removedTokenCount: 0,
      results: [
        { phoneNumber: "+51900000001", status: "sent", sentCount: 1, removedTokenCount: 0 },
        { phoneNumber: "+51900000002", status: "no_tokens", sentCount: 0, removedTokenCount: 0 },
        { phoneNumber: "+51900000003", status: "user_not_found", sentCount: 0, removedTokenCount: 0 },
      ],
    });
    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: { title: "Alerta de emergencia", body: "Se reporta una emergencia" },
        data: { lat: "-12.05", lng: "-77.04" },
      }),
    );
  });

  test("batches multicast sends and removes only invalid FCM tokens for a recipient", async () => {
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
      getRecipientByMobileNumber: jest.fn().mockResolvedValue({ uid: "recipient", fcmTokens: tokens }),
      removeTokens: jest.fn().mockResolvedValue(1),
    };
    const logger = { info: jest.fn() };
    const service = createNotificationService({ messaging, userService, logger });

    const result = await service.send({
      phoneNumbers: ["+51900000001"],
      message: "Body",
      coordinates: { lat: 0, lng: 0 },
    });

    expect(result).toEqual({
      attemptedCount: 1,
      sentCount: MAX_MULTICAST_TOKENS - 1,
      removedTokenCount: 1,
      results: [
        {
          phoneNumber: "+51900000001",
          status: "sent",
          sentCount: MAX_MULTICAST_TOKENS - 1,
          removedTokenCount: 1,
        },
      ],
    });
    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(userService.removeTokens).toHaveBeenCalledWith("recipient", [`token-${MAX_MULTICAST_TOKENS - 1}`]);
  });

  test("marks a recipient as failed when every token fails without being invalid", async () => {
    const messaging = {
      sendEachForMulticast: jest.fn().mockResolvedValue({
        successCount: 0,
        responses: [{ success: false, error: { code: "messaging/unavailable" } }],
      }),
    };
    const userService = {
      getRecipientByMobileNumber: jest.fn().mockResolvedValue({ uid: "recipient", fcmTokens: ["token-1"] }),
      removeTokens: jest.fn().mockResolvedValue(0),
    };
    const service = createNotificationService({ messaging, userService, logger: { info: jest.fn() } });

    const result = await service.send({
      phoneNumbers: ["+51900000001"],
      message: "Body",
      coordinates: { lat: 0, lng: 0 },
    });

    expect(result.results).toEqual([
      { phoneNumber: "+51900000001", status: "failed", sentCount: 0, removedTokenCount: 0 },
    ]);
  });
});

