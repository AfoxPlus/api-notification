const express = require("express");
const { asyncHandler } = require("../errors");
const { parseBody, registerTokenSchema, removeTokenSchema } = require("../validation");

function createTokenRouter({ authenticate, userService }) {
  const router = express.Router();

  router.post(
    "/register",
    authenticate,
    asyncHandler(async (request, response) => {
      const payload = parseBody(registerTokenSchema, request.body);
      await userService.registerToken({ uid: request.user.uid, ...payload });
      response.status(200).json({ registered: true });
    }),
  );

  router.post(
    "/remove",
    authenticate,
    asyncHandler(async (request, response) => {
      const { token } = parseBody(removeTokenSchema, request.body);
      const removed = await userService.removeToken({ uid: request.user.uid, token });
      response.status(200).json({ removed });
    }),
  );

  return router;
}

module.exports = { createTokenRouter };

