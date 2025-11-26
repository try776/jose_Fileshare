import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  UserFile: a
    .model({
      customName: a.string(),
      filePath: a.string(),
      fileSize: a.float(),
      downloadUrl: a.string(),
    })
    .authorization((allow) => [
      allow.owner(), // Besitzer darf alles
      allow.publicApiKey().to(['read']) // WICHTIG: Hier stand vorher 'guest()', jetzt 'publicApiKey()'
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // API Key explizit aktivieren (Gültig für 1 Jahr)
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});