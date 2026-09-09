const { loadConfig } = require("../src/config");

describe("environment configuration", () => {
  test("accepts Cloud Run Application Default Credentials without a credential file", () => {
    expect(loadConfig({})).toEqual({
      PORT: 3000,
      LOG_LEVEL: "info",
      NOTIFICATION_RATE_LIMIT_MAX: 30,
    });
  });

  test("parses configured local development values", () => {
    expect(
      loadConfig({
        PORT: "8080",
        GOOGLE_APPLICATION_CREDENTIALS: "/tmp/firebase.json",
        LOG_LEVEL: "debug",
        NOTIFICATION_RATE_LIMIT_MAX: "12",
      }),
    ).toEqual({
      PORT: 8080,
      GOOGLE_APPLICATION_CREDENTIALS: "/tmp/firebase.json",
      LOG_LEVEL: "debug",
      NOTIFICATION_RATE_LIMIT_MAX: 12,
    });
  });
});
