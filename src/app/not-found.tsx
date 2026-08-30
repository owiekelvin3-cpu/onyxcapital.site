import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] bg-bg-primary flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-brand font-mono text-sm mb-2">404</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Page not found
          </h1>
          <p className="text-sm text-text-tertiary mt-3 leading-relaxed">
            The page you are looking for does not exist or has been moved.
          </p>
          <div className="flex flex-col xs:flex-row gap-3 justify-center mt-8">
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Open Dashboard</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
