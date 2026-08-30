/** Notification title that triggers the copy-trading profit overlay on the user dashboard. */
export const COPY_TRADING_PROFIT_NOTIFICATION_TITLE = "Copy trading profit";

export type CopyTradingProfitEvent = {
  id: string;
  traderName: string;
  amount: number;
  message: string;
};

export type CopyTradingProfitCreditRow = {
  id: string;
  trader_name: string;
  amount: number;
  note?: string | null;
};

export function eventFromProfitCredit(row: CopyTradingProfitCreditRow): CopyTradingProfitEvent | null {
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: row.id,
    traderName: row.trader_name?.trim() || "Your trader",
    amount,
    message: "",
  };
}

export function parseCopyTradingProfitNotification(
  title: string,
  message: string,
  id: string
): CopyTradingProfitEvent | null {
  if (title !== COPY_TRADING_PROFIT_NOTIFICATION_TITLE) return null;

  const traderMatch = message.match(/^(.+?)\s+copied a winning trade/i);
  const amountMatch =
    message.match(/\+\s*\$([\d,]+\.\d{2})/) ??
    message.match(/added to your balance[^$]*\$([\d,]+\.\d{2})/i);

  const traderName = traderMatch?.[1]?.trim() || "Your trader";
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;

  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { id, traderName, amount, message };
}

