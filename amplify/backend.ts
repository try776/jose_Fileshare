import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { data } from './data/resource'; // <--- Prüfe, ob diese Zeile da ist!

defineBackend({
  auth,
  storage,
  data, // <--- Prüfe, ob "data" hier steht!
});