import { getAccount, getSession, json, publicAccount, SEEDED_TEAMS } from "./lib/market-store.mjs";

export async function handler(event) {
  const discordConfigured = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  const session = getSession(event);
  if (!session) {
    return json({ authenticated: false, discordConfigured, teams: SEEDED_TEAMS });
  }

  const account = await getAccount(session.sub);
  return json({
    authenticated: true,
    discordConfigured,
    user: {
      id: session.sub,
      username: session.username,
      avatar: session.avatar
    },
    account: publicAccount(account),
    teams: SEEDED_TEAMS
  });
}
