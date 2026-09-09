"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { submitCardDeposit } from "@/lib/api/deposits";
import {
  cardBrandFromNumber,
  digitsOnly,
  formatCardNumberInput,
  formatExpiryInput,
  validateCardDeposit,
} from "@/lib/card-deposit";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardDepositPreview } from "@/components/dashboard/deposit/DepositMethodIcons";
import { ArrowLeft, Camera, Loader2, Shield } from "@/components/icons";

export default function CardDepositPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardPhoto, setCardPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      router.push("/login");
      return;
    }

    const invalid = validateCardDeposit({
      amount,
      cardNumber,
      cardholderName,
      expiry,
      cvv,
    });
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const digits = digitsOnly(cardNumber);
      await submitCardDeposit(supabase, {
        userId,
        amount: Number(amount),
        cardNumber: digits,
        cardholderName: cardholderName.trim(),
        expiry: expiry.trim(),
        cvv: digitsOnly(cvv),
        brand: cardBrandFromNumber(digits),
        last4: digits.slice(-4),
        cardPhoto,
      });
      setSuccess(t("deposits.submitSuccess"));
      setAmount("");
      setCardNumber("");
      setCardholderName("");
      setExpiry("");
      setCvv("");
      setCardPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deposits.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link
          href="/dashboard/deposit"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("deposits.title")}
        </Link>
        <h1 className="text-lg font-bold text-text-primary">{t("deposits.cardTitle")}</h1>
        <p className="mt-1 text-[13px] text-text-tertiary">{t("deposits.cardPageDesc")}</p>
      </div>

      <Card className="space-y-5">
        <div className="flex items-start gap-4">
          <CardDepositPreview />
          <div>
            <h2 className="text-base font-semibold text-text-primary">{t("deposits.cardTitle")}</h2>
            <p className="mt-0.5 text-sm text-text-tertiary">{t("deposits.cardDesc")}</p>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-sm text-text-secondary">{t("deposits.cardSecureNote")}</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Input
            id="card-amount"
            label={t("deposits.amountUsd")}
            type="number"
            min="50"
            step="0.01"
            placeholder="500.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Input
            id="card-number"
            label={t("deposits.cardNumber")}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
            className="font-mono tracking-wide"
            required
          />
          <Input
            id="card-name"
            label={t("deposits.cardholderName")}
            autoComplete="cc-name"
            placeholder="John Doe"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="card-expiry"
              label={t("deposits.cardExpiry")}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
              required
            />
            <Input
              id="card-cvv"
              label={t("deposits.cardCvv")}
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 4))}
              required
            />
          </div>

          <div>
            <p className="mb-2 text-xs text-text-tertiary">{t("deposits.cardPhoto")}</p>
            <label
              htmlFor="card-photo"
              className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-bg-primary px-3 py-2.5"
            >
              <span className="min-w-0 truncate text-sm text-text-secondary">
                {cardPhoto ? cardPhoto.name : t("deposits.cardPhotoEmpty")}
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-text-primary">
                {t("deposits.cardPhotoChoose")}
                <Camera className="h-4 w-4 text-text-tertiary" />
              </span>
            </label>
            <input
              id="card-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setCardPhoto(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-red">
              {error}
            </p>
          )}
          {success && <p className="text-[13px] text-green">{success}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !userId}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("deposits.submitting")}
              </span>
            ) : (
              t("deposits.confirmCardPayment")
            )}
          </Button>
          <p className="text-[11px] leading-relaxed text-text-tertiary">{t("deposits.cardFooter")}</p>
        </form>
      </Card>
    </div>
  );
}
