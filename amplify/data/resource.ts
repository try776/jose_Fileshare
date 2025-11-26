import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
Wir definieren ein Datenbank-Modell "UserFile".
Die Autorisierungsregel "allow.owner()" sorgt dafür, dass jeder User
automatisch nur SEINE EIGENEN Einträge sieht, erstellt oder löscht.
=========================================================================*/
const schema = a.schema({
  UserFile: a
    .model({
      customName: a.string(),   // Der Name, den du eingibst
      filePath: a.string(),     // Der Pfad in S3 (z.B. public/meinBild.jpg)
      fileSize: a.float(),      // Dateigröße in MB
      downloadUrl: a.string(),  // Der generierte Smart-Link
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});