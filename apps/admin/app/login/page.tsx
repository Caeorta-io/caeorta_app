"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const unauthorized = searchParams.get("error") === "unauthorized";

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  }

  if (!sent) {
    return (
      <form onSubmit={handleSendOtp} className="flex flex-col gap-4 w-full max-w-sm">
        <div className="text-center mb-4">
          <p className="text-2xl font-semibold">Caeorta Admin</p>
          <p className="text-sm text-gray-500 mt-1">Internal use only</p>
        </div>
        {unauthorized && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-2">
            This email is not authorised to access the admin dashboard.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-2">
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border rounded px-4 py-2 text-sm w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send login code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="text-center mb-4">
        <p className="text-2xl font-semibold">Caeorta Admin</p>
        <p className="text-sm text-gray-500 mt-1">Enter the 6-digit code sent to {email}</p>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-2">
          {error}
        </div>
      )}
      <input
        type="text"
        placeholder="123456"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
        maxLength={6}
        className="border rounded px-4 py-2 text-sm w-full text-center text-2xl tracking-widest font-mono"
        autoComplete="one-time-code"
      />
      <button
        type="submit"
        disabled={loading || token.length !== 6}
        className="bg-black text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => { setSent(false); setToken(""); setError(""); }}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        Use a different email
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
