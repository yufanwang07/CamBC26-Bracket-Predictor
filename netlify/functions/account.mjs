import {
  assignTeam,
  cleanName,
  getAccount,
  getSession,
  INITIAL_UNLOCKED_BALANCE,
  json,
  LOCKED_BONUS_BALANCE,
  publicAccount,
  saveAccount,
  SEEDED_TEAMS
} from "./lib/market-store.mjs";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const session = getSession(event);
    if (!session) {
      return json({ error: "Sign in with Discord first." }, 401);
    }

    const existing = await getAccount(session.sub);
    if (existing) {
      return json({ authenticated: true, user: { id: session.sub, username: session.username }, account: publicAccount(existing) });
    }

    const body = JSON.parse(event.body || "{}");
    const displayName = cleanName(body.displayName);
    const affiliation = SEEDED_TEAMS.includes(body.affiliation) ? body.affiliation : "Other";
    if (!displayName) {
      return json({ error: "Display name is required." }, 400);
    }

    const account = await saveAccount({
      userId: session.sub,
      discordUsername: session.username,
      displayName,
      affiliation,
      assignedTeam: assignTeam(session.sub, affiliation),
      availableBalance: INITIAL_UNLOCKED_BALANCE,
      lockedBalance: LOCKED_BONUS_BALANCE,
      requiredBetPlaced: false,
      bets: [],
      createdAt: new Date().toISOString()
    });

    return json({
      authenticated: true,
      user: { id: session.sub, username: session.username },
      account: publicAccount(account)
    });
  } catch (error) {
    console.error("account function failed", error);
    return json({
      error: "Unable to create Axionite account.",
      detail: error?.message || String(error)
    }, 500);
  }
}
