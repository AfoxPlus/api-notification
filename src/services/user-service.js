const { AppError } = require("../errors");

function createUserService(firestore) {
  const users = firestore.collection("users");
  const usernameClaims = firestore.collection("usernames");

  async function registerToken({ uid, token, mobileNumber, username }) {
    const userRef = users.doc(uid);
    const usernameRef = usernameClaims.doc(username);

    await firestore.runTransaction(async (transaction) => {
      const [userSnapshot, usernameSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(usernameRef),
      ]);

      if (usernameSnapshot.exists && usernameSnapshot.data().uid !== uid) {
        throw new AppError(409, "username is already in use.");
      }

      const currentUser = userSnapshot.exists ? userSnapshot.data() : {};
      const previousUsername = currentUser.username;
      const fcmTokens = [...new Set([...(currentUser.fcmTokens || []), token])];
      const now = new Date();

      transaction.set(
        userRef,
        { fcmTokens, mobileNumber, username, updatedAt: now },
        { merge: true },
      );
      transaction.set(usernameRef, { uid, updatedAt: now });

      if (previousUsername && previousUsername !== username) {
        transaction.delete(usernameClaims.doc(previousUsername));
      }
    });
  }

  async function removeToken({ uid, token }) {
    const userRef = users.doc(uid);

    return firestore.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);

      if (!userSnapshot.exists) {
        return false;
      }

      const user = userSnapshot.data();
      const fcmTokens = user.fcmTokens || [];
      const nextTokens = fcmTokens.filter((storedToken) => storedToken !== token);
      const removed = nextTokens.length !== fcmTokens.length;

      if (removed) {
        transaction.update(userRef, { fcmTokens: nextTokens, updatedAt: new Date() });
      }

      return removed;
    });
  }

  async function getRecipient(uid) {
    const snapshot = await users.doc(uid).get();

    if (!snapshot.exists) {
      throw new AppError(404, "Recipient user was not found.");
    }

    return snapshot.data();
  }

  async function removeTokens(uid, tokensToRemove) {
    if (tokensToRemove.length === 0) {
      return 0;
    }

    const userRef = users.doc(uid);

    return firestore.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);

      if (!userSnapshot.exists) {
        return 0;
      }

      const removeSet = new Set(tokensToRemove);
      const currentTokens = userSnapshot.data().fcmTokens || [];
      const nextTokens = currentTokens.filter((token) => !removeSet.has(token));
      const removed = currentTokens.length - nextTokens.length;

      if (removed > 0) {
        transaction.update(userRef, { fcmTokens: nextTokens, updatedAt: new Date() });
      }

      return removed;
    });
  }

  return { getRecipient, registerToken, removeToken, removeTokens };
}

module.exports = { createUserService };

