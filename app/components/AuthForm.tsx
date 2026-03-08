import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

export function AuthForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn("password", { email, password, flow });
    } catch (err: any) {
      setError(
        flow === "signIn"
          ? "Invalid email or password."
          : "Could not create account. Email may already be in use."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    try {
      await signIn("google");
    } catch (err: any) {
      setError("Could not sign in with Google. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            ClipCut <span className="text-primary">AI</span>
          </h1>
          <p className="mt-2 text-text-muted">
            {flow === "signIn"
              ? "Sign in to access your projects"
              : "Create an account to get started"}
          </p>
        </div>

        <div className="rounded-xl border border-surface-lighter bg-surface-light p-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-surface-lighter bg-white px-4 py-2.5 font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-lighter" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-surface-lighter" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-text-muted"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-white placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-text-muted"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-white placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Min 8 characters"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : flow === "signIn"
                  ? "Sign In"
                  : "Create Account"}
            </button>

            <p className="mt-4 text-center text-sm text-text-muted">
              {flow === "signIn" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setFlow("signUp");
                      setError(null);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setFlow("signIn");
                      setError(null);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Link
            to="/try"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Try free with your own video &rarr;
          </Link>
          <Link
            to="/demo"
            className="text-sm text-text-muted transition-colors hover:text-primary hover:underline"
          >
            or view the interactive demo
          </Link>
        </div>
      </div>
    </div>
  );
}
