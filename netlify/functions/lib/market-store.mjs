import crypto from "node:crypto";

export const SEEDED_TEAMS = [
  "Oxford (aka Pantheon)",
  "something else",
  "Kessoku Band",
  "bwaaa",
  "MFF1",
  "muteki",
  "randomusergroup",
  "test",
  "Beehive",
  "Grandmaster Oogway",
  "Silver Street Capital",
  "anime girls against period cramp",
  "The Cambridge Edge",
  "Tootill Labs",
  "Axionite Allergic Individuals",
  "Mr Worldwide"
];

export const INITIAL_UNLOCKED_BALANCE = 100;
export const LOCKED_BONUS_BALANCE = 900;
export const REQUIRED_BET_AMOUNT = 100;

const STORE_NAME = "axionite-market";
const SESSION_COOKIE = "axionite_session";

export function json(body, status = 200, headers = {}) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

export function redirect(location, headers = {}) {
  return {
    statusCode: 302,
    headers: {
      location,
      "cache-control": "no-store",
      ...headers
    },
    body: ""
  };
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) {
          return [part, ""];
        }
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function hmac(value) {
  const secret = process.env.SESSION_SECRET || process.env.DISCORD_CLIENT_SECRET || "dev-only-secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionCookie(discordUser) {
  const payload = base64url(JSON.stringify({
    sub: discordUser.id,
    username: discordUser.global_name || discordUser.username,
    avatar: discordUser.avatar || "",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14
  }));
  const value = `${payload}.${hmac(payload)}`;
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSession(event) {
  const cookies = parseCookies(event.headers.cookie || "");
  const value = cookies[SESSION_COOKIE];
  if (!value) {
    return null;
  }
  const [payload, signature] = value.split(".");
  if (!payload || !signature || hmac(payload) !== signature) {
    return null;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.exp || session.exp < Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function marketStore() {
  const { getStore } = await import("@netlify/blobs");
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getStore(STORE_NAME, { siteID, token });
  }
  return getStore(STORE_NAME);
}

export async function getAccount(userId) {
  return await (await marketStore()).get(`account:${userId}`, { type: "json", consistency: "strong" });
}

export async function saveAccount(account) {
  account.updatedAt = new Date().toISOString();
  await (await marketStore()).setJSON(`account:${account.userId}`, account);
  return account;
}

export function cleanName(value) {
  return String(value || "").trim().slice(0, 32);
}

export function assignTeam(userId, affiliation) {
  if (SEEDED_TEAMS.includes(affiliation)) {
    return affiliation;
  }
  const hash = crypto.createHash("sha256").update(String(userId)).digest();
  return SEEDED_TEAMS[hash[0] % SEEDED_TEAMS.length];
}

export function publicAccount(account) {
  if (!account) {
    return null;
  }
  return {
    displayName: account.displayName,
    affiliation: account.affiliation,
    assignedTeam: account.assignedTeam,
    availableBalance: account.availableBalance,
    lockedBalance: account.lockedBalance,
    requiredBetPlaced: account.requiredBetPlaced,
    bets: account.bets || []
  };
}

export async function requireSessionAccount(event) {
  const session = getSession(event);
  if (!session) {
    return { error: json({ error: "Sign in with Discord first." }, 401) };
  }
  const account = await getAccount(session.sub);
  if (!account) {
    return { session, error: json({ error: "Create your Axionite account first." }, 409) };
  }
  return { session, account };
}
