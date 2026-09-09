const { AppError, asyncHandler } = require("../errors");

function createAuthenticate(auth) {
  return asyncHandler(async (request, _response, next) => {
    const authorization = request.get("authorization");
    const [, idToken] = authorization?.match(/^Bearer\s+(.+)$/i) || [];

    if (!idToken) {
      throw new AppError(401, "A Firebase ID Token is required.");
    }

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      request.user = { uid: decodedToken.uid };
      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(401, "The Firebase ID Token is invalid.");
    }
  });
}

module.exports = { createAuthenticate };

