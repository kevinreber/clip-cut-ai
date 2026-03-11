import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "@tanstack/react-router";

export function CreditsBadge() {
  const budget = useQuery(api.apiUsage.getBudgetStatus);

  if (!budget) return null;

  // BYOK users don't need to see credits
  if (budget.hasOwnKey) return null;

  const { creditsUsed, creditsRemaining, totalBudget } = budget;
  const pct = Math.round((creditsUsed / totalBudget) * 100);

  const isLow = creditsRemaining <= 3 && creditsRemaining > 0;
  const isExhausted = creditsRemaining === 0;

  const barColor = isExhausted
    ? "bg-danger"
    : isLow
      ? "bg-warning"
      : "bg-primary";

  const textColor = isExhausted
    ? "text-danger"
    : isLow
      ? "text-warning"
      : "text-text-muted";

  return (
    <div className="rounded-lg border border-surface-lighter bg-surface-light p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white">
          Free Platform Credits
        </span>
        <span className={`text-xs font-semibold ${textColor}`}>
          {creditsRemaining} / {totalBudget} remaining
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {isExhausted && (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2">
          <p className="text-xs text-danger">
            You've used all your free credits.{" "}
            <Link
              to="/settings"
              className="font-semibold underline hover:text-danger/80"
            >
              Add your own OpenAI API key
            </Link>{" "}
            to continue using AI features.
          </p>
        </div>
      )}

      {isLow && !isExhausted && (
        <p className="text-xs text-warning">
          Running low on credits.{" "}
          <Link
            to="/settings"
            className="font-semibold underline hover:text-warning/80"
          >
            Add your own API key
          </Link>{" "}
          for unlimited access.
        </p>
      )}

      {!isLow && !isExhausted && (
        <p className="text-xs text-text-muted">
          Using the shared platform key.{" "}
          <Link
            to="/settings"
            className="underline hover:text-white"
          >
            Add your own key
          </Link>{" "}
          for unlimited access.
        </p>
      )}
    </div>
  );
}
