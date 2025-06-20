const { google } = require('googleapis');

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  // Die Environment-Variablen
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Daten aus dem Body
  const body = JSON.parse(event.body);
  const { name, email, items } = body;
  const date = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' });

  // Google Auth
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Jede Bestellung als eigene Zeile eintragen
  const rows = items.map(item => [
    date,
    name,
    email,
    item.produkt || '',
    item.geschmack || '',
    item.menge || '',
    item.preis ? ("CHF " + Number(item.preis).toFixed(2)) : ""
  ]);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "A1", // Sheet beginnt bei A1, jede Bestellung wird angehängt
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows }
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};