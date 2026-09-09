const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

function createFirebaseServices() {
  const app = getApps()[0] || initializeApp({ credential: applicationDefault() });

  return {
    auth: getAuth(app),
    firestore: getFirestore(app),
    messaging: getMessaging(app),
  };
}

module.exports = { createFirebaseServices };

