import type { Account } from "@/types/database";

/**
 * Helpers for the iPhone "Tap to Pay" integration.
 *
 * An iOS Shortcuts personal automation (trigger: "Transaction" / Wallet)
 * opens a URL like:
 *
 *   https://your-app/transactions/new?source=tap&amount=₹1,250.00&merchant=Starbucks&card=HDFC%20Credit%20Card
 *
 * The values come from the Shortcut's "Shortcut Input" (Amount, Merchant,
 * Card or Pass), so they can be formatted in any locale.
 */

export interface TapPaymentParams {
  amount: string;
  merchant: string;
  card: string;
}

export function readTapPaymentParams(
  search: string
): TapPaymentParams | null {
  const params = new URLSearchParams(search);
  const amount = params.get("amount") ?? "";
  const merchant = params.get("merchant") ?? "";
  const card = params.get("card") ?? "";

  if (params.get("source") !== "tap" && !amount && !merchant) return null;

  return {
    amount: parseAmount(amount),
    merchant: merchant.trim(),
    card: card.trim(),
  };
}

/**
 * Turns a formatted currency string ("$4.50", "₹ 1,250.00", "4,50 €",
 * "1.234,56") into a plain decimal string ("4.50", "1250.00", "4.50",
 * "1234.56"). Returns "" when no number can be found.
 */
export function parseAmount(raw: string): string {
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return "";

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: whichever comes last is the decimal separator.
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma !== -1) {
    // Only commas: decimal if exactly 1–2 digits follow the single comma.
    const parts = s.split(",");
    s =
      parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2
        ? `${parts[0]}.${parts[1]}`
        : parts.join("");
  } else if (lastDot !== -1) {
    const parts = s.split(".");
    // "1.234.567" style thousand separators.
    if (parts.length > 2) s = parts.join("");
  }

  const value = Number(s);
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Picks the account that best matches the Wallet card name.
 * Falls back to undefined when nothing looks related.
 */
export function matchAccount(
  accounts: Account[],
  cardName: string
): Account | undefined {
  const card = normalize(cardName);
  if (!card) return undefined;

  const cardTokens = new Set(card.split(" ").filter((t) => t.length > 1));
  let best: Account | undefined;
  let bestScore = 0;

  for (const account of accounts) {
    const name = normalize(account.name);
    if (!name) continue;

    let score = 0;
    if (name === card) score = 100;
    else if (card.includes(name) || name.includes(card)) score = 50;
    else {
      for (const token of name.split(" ")) {
        if (cardTokens.has(token)) score += 10;
      }
    }
    // Tap payments are usually cards, so slightly prefer card/bank accounts.
    if (score > 0 && (account.type === "credit_card" || account.type === "bank")) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = account;
    }
  }

  return best;
}
