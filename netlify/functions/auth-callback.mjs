import { createSessionCookie, parseCookies, redirect } from "./lib/market-store.mjs";

export async function handler(event) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect("/?market_error=discord_env_missing");
  }

  const params = new URLSearchParams(event.rawQuery || "");
  const code = params.get("code");
  const state = params.get("state");
  const cookies = parseCookies(event.headers.cookie || "");
  if (!code || !state || state !== cookies.axionite_oauth_state) {
    return redirect("/?market_error=oauth_state");
  }

  const origin = process.env.URL || `${event.headers["x-forwarded-proto"] || "https"}://${event.headers.host}`;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${origin}/api/auth-callback`;
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    return redirect("/?market_error=token_exchange");
  }
  const token = await tokenResponse.json();
  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${token.access_token}` }
  });
  if (!userResponse.ok) {
    return redirect("/?market_error=discord_user");
  }
  const discordUser = await userResponse.json();

  return {
    statusCode: 302,
    headers: {
      location: "/?market=1",
      "cache-control": "no-store"
    },
    multiValueHeaders: {
      "set-cookie": [
        createSessionCookie(discordUser),
        "axionite_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      ]
    },
    body: ""
  };
}
