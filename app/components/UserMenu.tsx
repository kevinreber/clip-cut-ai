import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ThemeToggleButton } from "./ThemeToggle";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <ThemeToggleButton />
      <span className="text-sm text-text-muted">{user.email}</span>
      <button
        onClick={() => signOut()}
        className="rounded-md bg-surface-lighter px-3 py-1 text-sm text-text-muted transition-colors hover:text-white"
      >
        Sign Out
      </button>
    </div>
  );
}
