const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Push Notifications API",
    version: "1.0.0",
    description:
      "Registers Firebase Cloud Messaging devices and sends push notifications to registered users.",
  },
  servers: [{ url: "/", description: "Current server" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Firebase ID Token",
        description: "Firebase Authentication ID Token.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
      },
      Health: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", example: "ok" } },
      },
      RegisterTokenRequest: {
        type: "object",
        required: ["token", "mobileNumber", "username"],
        properties: {
          token: { type: "string", minLength: 1, maxLength: 4096 },
          mobileNumber: {
            type: "string",
            pattern: "^\\+[1-9]\\d{1,14}$",
            example: "+51999999999",
          },
          username: {
            type: "string",
            pattern: "^[a-z0-9_]{3,30}$",
            description: "Lowercase letters, numbers, and underscores only.",
            example: "juan_perez",
          },
        },
      },
      RegisterTokenResponse: {
        type: "object",
        required: ["registered"],
        properties: { registered: { type: "boolean", example: true } },
      },
      RemoveTokenRequest: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", minLength: 1, maxLength: 4096 },
        },
      },
      RemoveTokenResponse: {
        type: "object",
        required: ["removed"],
        properties: { removed: { type: "boolean" } },
      },
      SendNotificationRequest: {
        type: "object",
        required: ["toUserId", "title", "body"],
        properties: {
          toUserId: { type: "string", minLength: 1, maxLength: 128 },
          title: { type: "string", minLength: 1, maxLength: 200 },
          body: { type: "string", minLength: 1, maxLength: 4096 },
          data: {
            type: "object",
            description: "String keys of up to 128 characters with string values of up to 1024 characters.",
            additionalProperties: { type: "string", maxLength: 1024 },
            example: { chatId: "123" },
          },
        },
      },
      SendNotificationResponse: {
        type: "object",
        required: ["attemptedCount", "sentCount", "removedTokenCount"],
        properties: {
          attemptedCount: { type: "integer", minimum: 0 },
          sentCount: { type: "integer", minimum: 0 },
          removedTokenCount: { type: "integer", minimum: 0 },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid request body.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      Unauthorized: {
        description: "Missing or invalid Firebase ID Token.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      InternalError: {
        description: "Unexpected server error.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        responses: {
          200: {
            description: "API is available.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Health" } },
            },
          },
        },
      },
    },
    "/api/tokens/register": {
      post: {
        summary: "Register an FCM token",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterTokenRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Token registered.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterTokenResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: {
            description: "The username belongs to another user.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/tokens/remove": {
      post: {
        summary: "Remove an FCM token",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RemoveTokenRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Token removal completed.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RemoveTokenResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
    "/api/notifications/send": {
      post: {
        summary: "Send a push notification",
        description:
          "Sends to every registered recipient device and removes invalid or expired FCM tokens.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendNotificationRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Notification delivery attempted.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SendNotificationResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: {
            description: "Recipient user does not exist.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          409: {
            description: "Recipient has no registered device tokens.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          429: {
            description: "Notification rate limit exceeded.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          500: { $ref: "#/components/responses/InternalError" },
        },
      },
    },
  },
};

module.exports = { openapiDocument };
