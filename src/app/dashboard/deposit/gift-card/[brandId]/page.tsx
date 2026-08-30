"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";
import { getGiftCardBrand } from "@/lib/deposit-options";
import { submitGiftCardDeposit } from "@/lib/api/deposits";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploadField } from "@/components/dashboard/deposit/ImageUploadField";
import { GiftCardBrandTile } from "@/components/dashboard/deposit/DepositMethodIcons";
import { ArrowLeft, Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function GiftCardBrandDepositPage() {
  const params = useParams<{ brandId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const brand = getGiftCardBrand(params.brandId);

  const [userId, setUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!brand) {
      router.replace("/dashboard/deposit/gift-card");
    }
  }, [brand, router]);

  if (!brand) {
    return (
      <p className="py-8 text-center text-sm text-text-tertiary">Loading…</p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      router.push("/login");
      return;
    }
    if (!frontImage) {
      setError("Front image is required.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 50) {
      setError("Minimum deposit is $50");
      return;
    }
    if (!cardCode.trim()) {
      setError("Gift card code is required.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      await submitGiftCardDeposit(supabase, {
        userId,
        brandId: brand!.id,
        amount: parsedAmount,
        cardCode: cardCode.trim(),
        frontImage,
        backImage,
        additionalNotes: notes,
      });
      setSuccess(t("deposits.submitSuccess"));
      setAmount("");
      setCardCode("");
      setFrontImage(null);
      setBackImage(null);
      setNotes("");
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
          href="/dashboard/deposit/gift-card"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("deposits.backToBrands")}
        </Link>
        <div className="flex items-center gap-4">
          <GiftCardBrandTile brand={brand} size="lg" />
          <div>
            <h1 className="text-lg font-bold text-text-primary">{brand.fullName}</h1>
            <p className="text-[13px] text-text-tertiary">{t("deposits.giftCardFormDesc")}</p>
          </div>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="amount"
              label={t("deposits.cardValueLabel", { currency: "USD" })}
              type="number"
              min="50"
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              id="cardCode"
              label={t("deposits.cardCodeLabel")}
              placeholder="XXXX-XXXX-XXXX"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              className="font-mono tracking-wider"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploadField
              id="frontImage"
              label={t("deposits.frontImage")}
              required
              value={frontImage}
              onChange={setFrontImage}
            />
            <ImageUploadField
              id="backImage"
              label={t("deposits.backImage")}
              value={backImage}
              onChange={setBackImage}
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs text-text-tertiary mb-2">
              {t("deposits.additionalNotes")}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("deposits.additionalNotesPlaceholder")}
              rows={3}
              className={cn(
                "w-full resize-none rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary",
                "placeholder:text-text-tertiary outline-none focus:border-brand/40"
              )}
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-red">
              {error}
            </p>
          )}
          {success && <p className="text-[13px] text-green">{success}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !userId || !frontImage}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("deposits.submitting")}
              </span>
            ) : (
              t("deposits.submitGiftCard")
            )}
          </Button>

          <p className="text-[11px] text-text-tertiary leading-relaxed">
            Upload clear photos of your gift card. Our team verifies every redemption manually before crediting
            your account. Minimum deposit: $50.
          </p>
        </form>
      </Card>
    </div>
  );
}
