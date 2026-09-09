const request = require("supertest");
const pino = require("pino");
const { createApp } = require("../src/app");
const { createMockFirestore } = require("./helpers/mock-firestore");

function createTestApp({ documents, verifyIdToken, messaging } = {}) {
  const firestore = createMockFirestore(documents);
  const app = createApp({
    auth: { verifyIdToken: verifyIdToken || jest.fn().mockResolvedValue({ uid: "sender" }) },
    firestore,
    messaging: messaging || { sendEachForMulticast: jest.fn() },
    logger: pino({ enabled: false }),
  });

  return { app, firestore };
}

describe("HTTP API", () => {
  test("serves the OpenAPI document without authentication", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api-docs.json").expect(200);

    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "Firebase ID Token",
    });
    expect(response.body.paths).toEqual(
      expect.objectContaining({
        "/health": expect.any(Object),
        "/api/tokens/register": expect.any(Object),
        "/api/tokens/remove": expect.any(Object),
        "/api/notifications/send": expect.any(Object),
      }),
    );
  });

  test("serves Swagger UI without authentication", async () => {
    const { app } = createTestApp();

    const response = await request(app).get("/api-docs").expect(301);

    expect(response.headers.location).toBe("/api-docs/");
    await request(app).get("/api-docs/").expect(200).expect("Content-Type", /html/);
  });

  test("reports service health without authentication", async () => {
    const { app } = createTestApp();

    await request(app).get("/health").expect(200, { status: "ok" });
  });

  test("rejects protected routes without a Firebase Bearer token", async () => {
    const { app } = createTestApp();

    await request(app)
      .post("/api/tokens/register")
      .send({ token: "device-token", mobileNumber: "+51999999999", username: "juan_perez" })
      .expect(401, { error: "A Firebase ID Token is required." });
  });

  test("registers a normalized username and an FCM token for the authenticated user", async () => {
    const { app, firestore } = createTestApp();

    await request(app)
      .post("/api/tokens/register")
      .set("Authorization", "Bearer valid-id-token")
      .send({ token: "device-token", mobileNumber: "+51999999999", username: "Juan_Perez" })
      .expect(200, { registered: true });

    expect(firestore.get("users/sender")).toMatchObject({
      fcmTokens: ["device-token"],
      mobileNumber: "+51999999999",
      username: "juan_perez",
    });
    expect(firestore.get("usernames/juan_perez")).toMatchObject({ uid: "sender" });
  });

  test("rejects an invalid mobile number before registering", async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post("/api/tokens/register")
      .set("Authorization", "Bearer valid-id-token")
      .send({ token: "device-token", mobileNumber: "999999999", username: "juan_perez" })
      .expect(400);

    expect(response.body.error).toBe("Invalid request body.");
  });

  test("rejects a username claimed by another user", async () => {
    const { app } = createTestApp({
      documents: { "usernames/juan_perez": { uid: "another-user" } },
    });

    await request(app)
      .post("/api/tokens/register")
      .set("Authorization", "Bearer valid-id-token")
      .send({ token: "device-token", mobileNumber: "+51999999999", username: "juan_perez" })
      .expect(409, { error: "username is already in use." });
  });

  test("removes a token only from the authenticated user", async () => {
    const { app, firestore } = createTestApp({
      documents: {
        "users/sender": { fcmTokens: ["keep", "remove"] },
        "users/recipient": { fcmTokens: ["remove"] },
      },
    });

    await request(app)
      .post("/api/tokens/remove")
      .set("Authorization", "Bearer valid-id-token")
      .send({ token: "remove" })
      .expect(200, { removed: true });

    expect(firestore.get("users/sender").fcmTokens).toEqual(["keep"]);
    expect(firestore.get("users/recipient").fcmTokens).toEqual(["remove"]);
  });
});
