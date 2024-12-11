const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(require("../credentialsFirebase.json")),
  projectId: 'capstonec242-ps168' 
});

module.exports = admin;