import { defineAuth } from '@aws-amplify/backend';

/**
 * DefineAuth konfiguriert den Login.
 * Wir nutzen hier die einfachste Methode: Email als Benutzername.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
