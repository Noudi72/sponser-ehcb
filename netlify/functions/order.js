process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// netlify/functions/order.js
const { google } = require('googleapis');

exports.handler = async function(event, context) {
  // --- CORS-Header (für Preflight & alle Antworten!) ---
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  // Nur POST erlauben
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: "Method Not Allowed"
    };
  }

  try {
    // --- Der Rest wie gehabt ---
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const body = JSON.parse(event.body);

    const auth = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    await auth.authorize();

    const sheets = google.sheets({ version: "v4", auth });

    const SPREADSHEET_ID = '1ghgUqfMVAYuJoucv5Aj6NRxV4woKbGxvnHEeLerNHk0';
    const RANGE = 'Sponser Bestellformular!A2';

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
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ message: "OK" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: err.message,
        stack: err.stack
      })
    };
  }
};