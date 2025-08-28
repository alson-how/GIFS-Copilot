// backend/src/providers/maerskSchedules.js
import fetch from "node-fetch";

export async function getMaerskToken({ clientId, clientSecret, tokenUrl }) {
  // Check your Maersk portal for the exact grant and params (often OAuth2 client_credentials)
  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "schedules.read" // example; use the scope Maersk specifies
    })
  });
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return r.json(); // { access_token, token_type, expires_in }
}

export async function searchSchedules({
  accessToken,
  baseUrl, // e.g. from portal
  origin = "MYPKG",
  destination = "CNYTN",
  from = "2025-10-01",
  to = "2025-10-31",
  vesselOperatorCarrierCode = "MAEU" // Maersk operator; confirm code in portal
}) {
  const url = new URL(`${baseUrl}/schedules/point-to-point`);
  url.searchParams.set("originLocationCode", origin);
  url.searchParams.set("destinationLocationCode", destination);
  url.searchParams.set("departureDateFrom", from);
  url.searchParams.set("departureDateTo", to);
  url.searchParams.set("vesselOperatorCarrierCode", vesselOperatorCarrierCode);

  const r = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
      // If Maersk requires a subscription key header, include it:
      // "Ocp-Apim-Subscription-Key": process.env.MAERSK_SUBSCRIPTION_KEY
    }
  });
  if (!r.ok) throw new Error(`Schedules failed: ${await r.text()}`);
  return r.json();
}
