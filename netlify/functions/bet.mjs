import crypto from "node:crypto";
import {
  json,
  LOCKED_BONUS_BALANCE,
  marketStore,
  publicAccount,
  REQUIRED_BET_AMOUNT,
  requireSessionAccount,
  saveAccount
} from "./lib/market-store.mjs";

const OUTCOMES = new Set(["above", "below", "equal", "no_match"]);

function cleanBet(body) {
  return {
    marketId: String(body.marketId || "").slice(0, 220),
    label: String(body.label || "").slice(0, 60),
    teamA: String(body.teamA || ""),
    teamB: String(body.teamB || ""),
    selectedTeam: String(body.selectedTeam || ""),
    outcome: String(body.outcome || ""),
    amount: Math.floor(Number(body.amount || 0)),
    predA: Number(body.predA || 0),
    predB: Number(body.predB || 0)
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const { session, account, error } = await requireSessionAccount(event);
    if (error) {
      return error;
    }

    const bet = cleanBet(JSON.parse(event.body || "{}"));
    if (!bet.marketId || !bet.label) {
      return json({ error: "Missing market." }, 400);
    }
    if (![bet.teamA, bet.teamB].includes(bet.selectedTeam)) {
      return json({ error: "Choose one of the teams in this match." }, 400);
    }
    if (!OUTCOMES.has(bet.outcome)) {
      return json({ error: "Choose an outcome." }, 400);
    }
    if (bet.amount <= 0) {
      return json({ error: "Bet amount must be positive." }, 400);
    }

    const locked = !account.requiredBetPlaced;
    if (locked) {
      if (![bet.teamA, bet.teamB].includes(account.assignedTeam)) {
        return json({ error: `Your unlock bet must be on a match involving ${account.assignedTeam}.` }, 400);
      }
      if (bet.selectedTeam !== account.assignedTeam) {
        return json({ error: `Your unlock bet must be on ${account.assignedTeam}.` }, 400);
      }
      if (bet.amount !== REQUIRED_BET_AMOUNT) {
        return json({ error: `Your unlock bet must be exactly ${REQUIRED_BET_AMOUNT} AX.` }, 400);
      }
    }

    if (bet.amount > account.availableBalance) {
      return json({ error: "Insufficient Axionite." }, 400);
    }

    const now = new Date().toISOString();
    const betId = crypto.randomUUID();
    const record = {
      id: betId,
      userId: session.sub,
      ...bet,
      status: "open",
      createdAt: now
    };

    await (await marketStore()).setJSON(`bet:${betId}`, record);

    account.availableBalance -= bet.amount;
    if (locked) {
      account.requiredBetPlaced = true;
      account.lockedBalance = 0;
      account.availableBalance += LOCKED_BONUS_BALANCE;
    }
    account.bets = [
      { id: betId, marketId: bet.marketId, label: bet.label, selectedTeam: bet.selectedTeam, outcome: bet.outcome, amount: bet.amount, createdAt: now },
      ...(account.bets || [])
    ].slice(0, 40);
    await saveAccount(account);

    return json({
      authenticated: true,
      user: { id: session.sub, username: session.username },
      account: publicAccount(account),
      bet: record
    });
  } catch (error) {
    console.error("bet function failed", error);
    return json({
      error: "Unable to place Axionite bet.",
      detail: error?.message || String(error)
    }, 500);
  }
}
