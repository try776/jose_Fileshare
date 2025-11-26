import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { data } from './data/resource'; // <--- Das hier hat gefehlt!

defineBackend({
  auth,
  storage,
  data, // <--- Das hier auch!
});