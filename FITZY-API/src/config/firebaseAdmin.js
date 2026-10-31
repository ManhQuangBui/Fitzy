const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { AppError } = require('../utils/errors');

const appName = 'fitzy-auth';

function getFirebaseAdminAuth() {
  const existing = getApps().find(app => app.name === appName);
  if (existing) return getAuth(existing);

  const projectId = process.env.FIREBASE_PROJECT_ID || undefined;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  let credential;

  if (projectId && clientEmail && privateKey) credential = cert({ projectId, clientEmail, privateKey });
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) credential = applicationDefault();
  else throw new AppError('Firebase Admin is not configured on the API.', 503, 'FIREBASE_NOT_CONFIGURED');

  const app = initializeApp({ credential, projectId }, appName);
  return getAuth(app);
}

module.exports = { getFirebaseAdminAuth };
