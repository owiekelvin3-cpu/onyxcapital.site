import { Suspense } from "react";
import VerifyEmailForm from "./VerifyEmailForm";

export const metadata = {
  title: "Verify email",
  description: "Enter the 6-digit code we sent to your email.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
