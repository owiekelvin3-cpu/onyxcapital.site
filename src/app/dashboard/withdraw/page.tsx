"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserWithdrawals, submitWithdrawal, getWithdrawalEligibility } from "@/lib/api/withdrawals";
import { getUsdBalance } from "@/lib/api/trading";
import type { WithdrawalRow } from "@/lib/supabase/types";
import {
  WITHDRAWAL_CRYPTO_ASSETS,
  EWALLET_PROVIDERS,
  MOBILE_MONEY_PROVIDERS,
  INSTANT_PAY_PROVIDERS,
  getWithdrawalMethod,
  getNetworksForAsset,
  type WithdrawalMethodId,
  type EwalletProviderId,
  type MobileMoneyProviderId,
  type InstantPayProviderId,
} from "@/lib/withdrawal-options";
import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Clock, Comments } from "@/components/icons";
import { CryptoIcon, BrandIcon } from "@/components/crypto/CryptoIcon";
import {
  WithdrawalPageHeader,
  WithdrawalBalanceBanner,
  WithdrawalMethodPicker,
  WithdrawalAmountField,
  WithdrawalCodeField,
  WithdrawalPayoutSummary,
  WithdrawalConfirmBar,
  WithdrawalSecurityNote,
  WithdrawalAlert,
  WithdrawalHistoryList,
  Input,
} from "@/components/dashboard/WithdrawalUi";

const EMPTY_BANK = {
  accountHolder: "",
  bankName: "",
  accountNumber: "",
  routingNumber: "",
  iban: "",
  swiftCode: "",
  country: "",
};

const EMPTY_DEBIT = {
  cardHolder: "",
  cardNumber: "",
  expiry: "",
};

const EMPTY_MOBILE = {
  accountName: "",
  phoneNumber: "",
};

const EMPTY_INSTANT = {
  handle: "",
};

export default function WithdrawPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [method, setMethod] = useState<WithdrawalMethodId>("crypto");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<string>("USDT");
  const [network, setNetwork] = useState("TRC20");
  const [walletAddress, setWalletAddress] = useState("");
  const [bank, setBank] = useState(EMPTY_BANK);
  const [ewalletProvider, setEwalletProvider] = useState<EwalletProviderId>("paypal");
  const [ewalletEmail, setEwalletEmail] = useState("");
  const [mobileProvider, setMobileProvider] = useState<MobileMoneyProviderId>("mpesa");
  const [mobile, setMobile] = useState(EMPTY_MOBILE);
  const [instantProvider, setInstantProvider] = useState<InstantPayProviderId>("cashapp");
  const [instant, setInstant] = useState(EMPTY_INSTANT);
  const [debit, setDebit] = useState(EMPTY_DEBIT);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [withdrawalCode, setWithdrawalCode] = useState("");
  const [hasWithdrawalCode, setHasWithdrawalCode] = useState(false);

  const selectedMethod = useMemo(() => getWithdrawalMethod(method), [method]);
  const networks = useMemo(() => getNetworksForAsset(asset), [asset]);
  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        setBalance(await getUsdBalance(supabase, user.id));
        setWithdrawals(await getUserWithdrawals(supabase, user.id));
        const eligibility = await getWithdrawalEligibility(supabase);
        setHasWithdrawalCode(Boolean(eligibility.has_withdrawal_code));
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!networks.includes(network)) {
      setNetwork(networks[0] ?? "TRC20");
    }
  }, [networks, network]);

  function handleMethodChange(next: WithdrawalMethodId) {
    setMethod(next);
    setConfirming(false);
    setError("");
  }

  function updateBank(field: keyof typeof EMPTY_BANK, value: string) {
    setBank((prev) => ({ ...prev, [field]: value }));
    setConfirming(false);
  }

  function updateDebit(field: keyof typeof EMPTY_DEBIT, value: string) {
    setDebit((prev) => ({ ...prev, [field]: value }));
    setConfirming(false);
  }

  function updateMobile(field: keyof typeof EMPTY_MOBILE, value: string) {
    setMobile((prev) => ({ ...prev, [field]: value }));
    setConfirming(false);
  }

  function updateInstant(field: keyof typeof EMPTY_INSTANT, value: string) {
    setInstant((prev) => ({ ...prev, [field]: value }));
    setConfirming(false);
  }

  function validateForm(): { destination: string; details: Record<string, string> } | null {
    const value = parsedAmount;
    if (!value || value <= 0) {
      setError("Enter a valid amount");
      return null;
    }
    if (value < selectedMethod.minAmount) {
      setError(`Minimum withdrawal for this method is $${selectedMethod.minAmount.toFixed(2)}`);
      return null;
    }
    if (balance !== null && value > balance) {
      setError("Insufficient balance");
      return null;
    }
    if (!withdrawalCode.replace(/\s+/g, "")) {
      setError("Enter your withdrawal code");
      return null;
    }

    if (method === "crypto") {
      if (!walletAddress.trim()) {
        setError("Enter your wallet address");
        return null;
      }
      return {
        destination: walletAddress.trim(),
        details: { asset, network, walletAddress: walletAddress.trim() },
      };
    }

    if (method === "bank_transfer") {
      if (!bank.accountHolder.trim() || !bank.bankName.trim() || !bank.accountNumber.trim()) {
        setError("Complete all required bank fields");
        return null;
      }
      return {
        destination: bank.accountNumber.trim(),
        details: { ...bank, type: "bank_transfer" },
      };
    }

    if (method === "wire") {
      if (
        !bank.accountHolder.trim() ||
        !bank.bankName.trim() ||
        !bank.iban.trim() ||
        !bank.swiftCode.trim()
      ) {
        setError("Complete all required wire transfer fields");
        return null;
      }
      return {
        destination: bank.iban.trim(),
        details: { ...bank, type: "wire" },
      };
    }

    if (method === "paypal") {
      if (!ewalletEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ewalletEmail.trim())) {
        setError("Enter a valid e-wallet email");
        return null;
      }
      return {
        destination: ewalletEmail.trim(),
        details: {
          provider: ewalletProvider,
          email: ewalletEmail.trim(),
          type: "ewallet",
        },
      };
    }

    if (method === "debit_card") {
      if (!debit.cardHolder.trim() || !debit.cardNumber.trim() || !debit.expiry.trim()) {
        setError("Complete all debit card fields");
        return null;
      }
      return {
        destination: debit.cardNumber.trim(),
        details: {
          ...debit,
          type: "debit_card",
        },
      };
    }

    if (method === "mobile_money") {
      if (!mobile.accountName.trim() || !mobile.phoneNumber.trim()) {
        setError("Enter account name and mobile money phone number");
        return null;
      }
      return {
        destination: mobile.phoneNumber.trim(),
        details: {
          provider: mobileProvider,
          accountHolder: mobile.accountName.trim(),
          phoneNumber: mobile.phoneNumber.trim(),
          type: "mobile_money",
        },
      };
    }

    if (method === "instant_pay") {
      if (!instant.handle.trim()) {
        setError("Enter your Cash App $tag, Venmo @username, or Zelle email/phone");
        return null;
      }
      return {
        destination: instant.handle.trim(),
        details: {
          provider: instantProvider,
          cashtag: instant.handle.trim(),
          type: "instant_pay",
        },
      };
    }

    setError("Select a payout method");
    return null;
  }

  function handleReview() {
    setError("");
    setSuccess("");
    if (!userId) {
      router.push("/login");
      return;
    }
    const payload = validateForm();
    if (!payload) return;
    setConfirming(true);
  }

  async function handleConfirm() {
    const payload = validateForm();
    if (!payload || !userId) return;

    setSubmitting(true);
    setError("");
    try {
      const supabase = createClient();
      const row = await submitWithdrawal(supabase, {
        userId,
        amount: parsedAmount,
        currency: method === "crypto" ? asset : "USD",
        method,
        destination: payload.destination,
        details: payload.details,
        withdrawalCode: withdrawalCode.replace(/\s+/g, ""),
      });
      setWithdrawals((prev) => [row, ...prev]);
      setAmount("");
      setWithdrawalCode("");
      setWalletAddress("");
      setBank(EMPTY_BANK);
      setDebit(EMPTY_DEBIT);
      setMobile(EMPTY_MOBILE);
      setInstant(EMPTY_INSTANT);
      setEwalletEmail("");
      setConfirming(false);
      setSuccess(
        `Withdrawal request submitted via ${selectedMethod.label}. Expected processing: ${selectedMethod.processingTime}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  const formDisabled = loading || submitting || !userId || (balance ?? 0) <= 0;
  const showWithdrawForm = !loading;

  return (
    <div className="space-y-5 max-w-3xl pb-2">
      <WithdrawalPageHeader />

      <WithdrawalBalanceBanner balance={balance} loading={loading} />

      {showWithdrawForm && (
        <>
          <Card className="rounded-2xl p-4 sm:p-5 space-y-5">
            <WithdrawalMethodPicker method={method} onChange={handleMethodChange} />

            <div className="border-t border-border pt-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Payout details</h2>
                <p className="text-xs text-text-tertiary mt-1">
                  {selectedMethod.description}
                </p>
              </div>

              {balance !== null && (
                <WithdrawalAmountField
                  balance={balance}
                  amount={amount}
                  onChange={(v) => {
                    setAmount(v);
                    setConfirming(false);
                  }}
                  min={selectedMethod.minAmount}
                />
              )}

              <WithdrawalCodeField
                value={withdrawalCode}
                hasCode={hasWithdrawalCode}
                onChange={(v) => {
                  setWithdrawalCode(v);
                  setConfirming(false);
                }}
              />

              {method === "crypto" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-tertiary mb-2">Asset</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {WITHDRAWAL_CRYPTO_ASSETS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => {
                            setAsset(a);
                            setConfirming(false);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors cursor-pointer text-left",
                            asset === a
                              ? "bg-brand/10 text-brand border-brand/40"
                              : "bg-bg-primary text-text-secondary border-border hover:border-border-light hover:bg-bg-hover/40"
                          )}
                        >
                          <CryptoIcon symbol={a} label={a} size="sm" selected={asset === a} />
                          <span className="text-sm font-semibold">{a}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-tertiary mb-2">Network</label>
                    <div className="flex flex-wrap gap-2">
                      {networks.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setNetwork(n);
                            setConfirming(false);
                          }}
                          className={cn(
                            "px-3 py-2 rounded-lg text-[13px] border transition-colors cursor-pointer",
                            network === n
                              ? "bg-brand/10 text-brand border-brand/40"
                              : "bg-bg-primary text-text-secondary border-border hover:border-border-light"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="wallet"
                    label="Wallet address"
                    placeholder="Paste your receiving address"
                    value={walletAddress}
                    onChange={(e) => {
                      setWalletAddress(e.target.value);
                      setConfirming(false);
                    }}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-text-tertiary -mt-2">
                    Double-check the address and network — incorrect details may result in lost funds.
                  </p>
                </>
              )}

              {method === "bank_transfer" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="account-holder"
                    label="Account holder name *"
                    placeholder="Full name on account"
                    value={bank.accountHolder}
                    onChange={(e) => updateBank("accountHolder", e.target.value)}
                  />
                  <Input
                    id="bank-name"
                    label="Bank name *"
                    placeholder="e.g. Chase, Barclays"
                    value={bank.bankName}
                    onChange={(e) => updateBank("bankName", e.target.value)}
                  />
                  <Input
                    id="account-number"
                    label="Account number *"
                    placeholder="Account number"
                    value={bank.accountNumber}
                    onChange={(e) => updateBank("accountNumber", e.target.value)}
                  />
                  <Input
                    id="routing-number"
                    label="Routing / Sort code"
                    placeholder="Routing, sort, or BSB"
                    value={bank.routingNumber}
                    onChange={(e) => updateBank("routingNumber", e.target.value)}
                  />
                  <Input
                    id="country"
                    label="Country"
                    placeholder="Country of bank"
                    value={bank.country}
                    onChange={(e) => updateBank("country", e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>
              )}

              {method === "wire" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="wire-holder"
                    label="Beneficiary name *"
                    placeholder="Full legal name"
                    value={bank.accountHolder}
                    onChange={(e) => updateBank("accountHolder", e.target.value)}
                  />
                  <Input
                    id="wire-bank"
                    label="Bank name *"
                    placeholder="Receiving bank"
                    value={bank.bankName}
                    onChange={(e) => updateBank("bankName", e.target.value)}
                  />
                  <Input
                    id="wire-iban"
                    label="IBAN / Account number *"
                    placeholder="International account number"
                    value={bank.iban}
                    onChange={(e) => updateBank("iban", e.target.value)}
                  />
                  <Input
                    id="wire-swift"
                    label="SWIFT / BIC code *"
                    placeholder="e.g. CHASUS33"
                    value={bank.swiftCode}
                    onChange={(e) => updateBank("swiftCode", e.target.value)}
                  />
                  <Input
                    id="wire-country"
                    label="Bank country"
                    placeholder="Country"
                    value={bank.country}
                    onChange={(e) => updateBank("country", e.target.value)}
                    className="sm:col-span-2"
                  />
                </div>
              )}

              {method === "paypal" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-tertiary mb-2">Provider</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {EWALLET_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setEwalletProvider(p.id);
                            setConfirming(false);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-colors cursor-pointer",
                            ewalletProvider === p.id
                              ? "border-brand/50 bg-brand/5"
                              : "border-border bg-bg-primary hover:bg-bg-hover"
                          )}
                        >
                          <BrandIcon
                            src={p.iconUrl}
                            alt={p.label}
                            size="md"
                            selected={ewalletProvider === p.id}
                            fallback={p.label.charAt(0)}
                            fallbackBg={p.color}
                          />
                          <span className="text-xs font-semibold text-text-primary">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="ewallet-email"
                    label={`${EWALLET_PROVIDERS.find((p) => p.id === ewalletProvider)?.label ?? "E-wallet"} email *`}
                    type="email"
                    placeholder="you@email.com"
                    value={ewalletEmail}
                    onChange={(e) => {
                      setEwalletEmail(e.target.value);
                      setConfirming(false);
                    }}
                  />
                </>
              )}

              {method === "debit_card" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="card-holder"
                    label="Cardholder name *"
                    placeholder="Name on card"
                    value={debit.cardHolder}
                    onChange={(e) => updateDebit("cardHolder", e.target.value)}
                  />
                  <Input
                    id="card-number"
                    label="Debit card number *"
                    placeholder="4111 1111 1111 1111"
                    value={debit.cardNumber}
                    onChange={(e) => updateDebit("cardNumber", e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Input
                    id="card-expiry"
                    label="Expiry (MM/YY) *"
                    placeholder="08/28"
                    value={debit.expiry}
                    onChange={(e) => updateDebit("expiry", e.target.value)}
                  />
                  <p className="sm:col-span-2 text-[11px] text-text-tertiary leading-relaxed">
                    Visa and Mastercard debit cards only. Name must match your verified identity.
                  </p>
                </div>
              )}

              {method === "mobile_money" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-tertiary mb-2">Provider</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {MOBILE_MONEY_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setMobileProvider(p.id);
                            setConfirming(false);
                          }}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer",
                            mobileProvider === p.id
                              ? "border-brand/50 bg-brand/5 text-brand"
                              : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="mobile-name"
                      label="Account name *"
                      placeholder="Registered account name"
                      value={mobile.accountName}
                      onChange={(e) => updateMobile("accountName", e.target.value)}
                    />
                    <Input
                      id="mobile-phone"
                      label="Mobile money number *"
                      placeholder="+254 7XX XXX XXX"
                      value={mobile.phoneNumber}
                      onChange={(e) => updateMobile("phoneNumber", e.target.value)}
                    />
                  </div>
                </>
              )}

              {method === "instant_pay" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-tertiary mb-2">App</label>
                    <div className="grid grid-cols-3 gap-2">
                      {INSTANT_PAY_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setInstantProvider(p.id);
                            setConfirming(false);
                          }}
                          className={cn(
                            "rounded-xl border px-3 py-3 text-center text-xs font-semibold transition-colors cursor-pointer",
                            instantProvider === p.id
                              ? "border-brand/50 bg-brand/5 text-brand"
                              : "border-border bg-bg-primary text-text-secondary hover:bg-bg-hover"
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="instant-handle"
                    label={
                      instantProvider === "cashapp"
                        ? "Cash App $cashtag *"
                        : instantProvider === "venmo"
                          ? "Venmo @username *"
                          : "Zelle email or phone *"
                    }
                    placeholder={
                      instantProvider === "cashapp"
                        ? "$yourtag"
                        : instantProvider === "venmo"
                          ? "@username"
                          : "you@email.com or +1..."
                    }
                    value={instant.handle}
                    onChange={(e) => updateInstant("handle", e.target.value)}
                  />
                </>
              )}

              <WithdrawalPayoutSummary
                amount={parsedAmount}
                methodId={method}
                methodLabel={selectedMethod.label}
                processingTime={selectedMethod.processingTime}
              />

              {error && <WithdrawalAlert type="error">{error}</WithdrawalAlert>}
              {success && <WithdrawalAlert type="success">{success}</WithdrawalAlert>}

              {confirming ? (
                <WithdrawalConfirmBar
                  amount={parsedAmount}
                  methodLabel={selectedMethod.label}
                  loading={submitting}
                  onCancel={() => setConfirming(false)}
                  onConfirm={() => void handleConfirm()}
                />
              ) : (
                <Button
                  type="button"
                  className="w-full !h-12"
                  disabled={formDisabled || parsedAmount <= 0}
                  onClick={handleReview}
                >
                  Review withdrawal request
                </Button>
              )}

              <p className="text-[11px] text-text-tertiary leading-relaxed flex items-center gap-1.5">
                <Clock className="w-3 h-3 shrink-0" />
                Min {selectedMethod.minAmount.toFixed(0)} USD · {selectedMethod.feeLabel}
              </p>
            </div>
          </Card>

          <WithdrawalSecurityNote />
        </>
      )}

      <CollapsibleSection
        title="Recent withdrawals"
        subtitle={
          withdrawals.length > 0
            ? `${withdrawals.length} ${withdrawals.length === 1 ? "payout" : "payouts"}`
            : "Your payout history will appear here"
        }
      >
        <WithdrawalHistoryList withdrawals={withdrawals} />
      </CollapsibleSection>

      <p className="text-center text-xs text-text-tertiary pb-1">
        Need help with a payout?{" "}
        <Link href="/dashboard/support" className="font-medium text-brand hover:text-brand-hover inline-flex items-center gap-1">
          <Comments className="w-3.5 h-3.5" />
          Contact support
        </Link>
      </p>
    </div>
  );
}
