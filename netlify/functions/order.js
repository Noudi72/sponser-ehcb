process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

console.log("Netlify-Funktion order.js gestartet");

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

    console.log("Google Sheets Append erfolgreich:", values.length, "Zeilen");

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ message: "OK" })
    };
  } catch (err) {
    // Fehler-Logging direkt an die Netlify-Konsole!
    console.error("FEHLER Google Service Account:", process.env.GOOGLE_SERVICE_ACCOUNT ? "vorhanden" : "FEHLT");
    console.error("FEHLER Event-Body:", event.body);
    console.error("FEHLER:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        error: err.message,
        stack: err.stack,
        details: err,
        env: process.env.GOOGLE_SERVICE_ACCOUNT ? "Service Account geladen" : "Service Account FEHLT",
        eventBody: event.body
      })
    };
  }
};