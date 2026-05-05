import crypto from "node:crypto";
import { redirect } from "./lib/market-store.mjs";

export async function handler(event) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return redirect("/?market_error=discord_client_missing");
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const origin = process.env.URL || `${event.headers["x-forwarded-proto"] || "https"}://${event.headers.host}`;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${origin}/api/auth-callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state
  });

  return redirect(`https://discord.com/oauth2/authorize?${params.toString()}`, {
    "set-cookie": `axionite_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  });
}
