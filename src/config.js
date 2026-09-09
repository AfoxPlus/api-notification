const { z } = require("zod");

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NOTIFICATION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
});

function loadConfig(environment = process.env) {
  return environmentSchema.parse(environment);
}

module.exports = { loadConfig };
