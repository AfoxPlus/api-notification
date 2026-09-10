const { z } = require("zod");
const { AppError } = require("./errors");

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

const registerTokenSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  mobileNumber: z
    .string()
    .trim()
    .regex(E164_PATTERN, "mobileNumber must use E.164 format."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      USERNAME_PATTERN,
      "username must be 3-30 lowercase letters, numbers, or underscores.",
    ),
});

const removeTokenSchema = z.object({
  token: z.string().trim().min(1).max(4096),
});

const notificationSchema = z.object({
  phoneNumbers: z
    .array(z.string().trim().regex(E164_PATTERN, "Each phone number must use E.164 format."))
    .min(1)
    .max(100),
  message: z.string().trim().min(1).max(4096),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

function parseBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError(400, "Invalid request body.", result.error.flatten());
  }

  return result.data;
}

module.exports = {
  notificationSchema,
  parseBody,
  registerTokenSchema,
  removeTokenSchema,
};

