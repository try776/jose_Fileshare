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
      allow.guest().to(['read']) // WICHTIG: Gäste dürfen lesen (für den Download-Link)
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // Wir fügen IAM hinzu, damit Gäste (Identity Pool) zugreifen dürfen
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});