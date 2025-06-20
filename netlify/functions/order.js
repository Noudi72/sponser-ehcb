// netlify/functions/order.js
const { google } = require('googleapis');

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Environment Variable mit Service Account JSON
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const body = JSON.parse(event.body);

  const auth = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: "v4", auth });

  const SPREADSHEET_ID = '1ghgUqfMVAYuJoucv5Aj6NRxV4woKbGxvnHEeLerNHk0';
  const RANGE = 'Sponser Bestellformular!A2'; // Passe an, falls nötig

  // Schreibe jede Artikelzeile einzeln ins Sheet
  const now = new Date().toLocaleString("de-CH", { timeZone: "Europe/Zurich" });

  const values = body.items.map(item => [
    now,
    body.name,
    body.email,
    item.produkt,
    item.geschmack,
    item.menge,
    item.preis ? ("CHF " + Number(item.preis).toFixed(2)) : ""
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "OK" }),
  };
};