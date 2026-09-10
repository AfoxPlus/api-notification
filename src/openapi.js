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
        required: ["phoneNumbers", "message", "coordinates"],
        properties: {
          phoneNumbers: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: {
              type: "string",
              pattern: "^\\+[1-9]\\d{1,14}$",
              example: "+51999999999",
            },
          },
          message: { type: "string", minLength: 1, maxLength: 4096 },
          coordinates: {
            type: "object",
            required: ["lat", "lng"],
            properties: {
              lat: { type: "number", minimum: -90, maximum: 90 },
              lng: { type: "number", minimum: -180, maximum: 180 },
            },
          },
        },
      },
      SendNotificationResult: {
        type: "object",
        required: ["phoneNumber", "status", "sentCount", "removedTokenCount"],
        properties: {
          phoneNumber: { type: "string", example: "+51999999999" },
          status: {
            type: "string",
            enum: ["sent", "failed", "user_not_found", "no_tokens"],
          },
          sentCount: { type: "integer", minimum: 0 },
          removedTokenCount: { type: "integer", minimum: 0 },
        },
      },
      SendNotificationResponse: {
        type: "object",
        required: ["attemptedCount", "sentCount", "removedTokenCount", "results"],
        properties: {
          attemptedCount: { type: "integer", minimum: 0 },
          sentCount: { type: "integer", minimum: 0 },
          removedTokenCount: { type: "integer", minimum: 0 },
          results: {
            type: "array",
            items: { $ref: "#/components/schemas/SendNotificationResult" },
          },
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
        summary: "Send a push notification to a list of phone numbers",
        description:
          "Looks up the registered user for each phone number and sends a push notification with the given " +
          "message and coordinates to all of their devices, removing invalid or expired FCM tokens. Phone " +
          "numbers with no registered user or tokens are reported per-item instead of failing the whole request.",
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
