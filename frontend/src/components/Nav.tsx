"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { logout as apiLogout } from "@/lib/api";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, loading } = useAuth();

  const linkClass = (href: string) =>
    `px-3 py-2 rounded text-sm ${
      pathname === href ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
    }`;

  async function handleLogout() {
    await apiLogout();
    setUser(null);
    router.push("/login");
  }

  return (
    <nav className="bg-black border-b border-gray-800 px-8 py-3 flex items-center justify-between">
      <div className="flex gap-2">
        {user && (
          <>
            <Link href="/" className={linkClass("/")}>
              Transactions
            </Link>
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Dashboard
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {loading ? null : user ? (
          <>
            <span className="text-gray-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded bg-gray-800 text-white hover:bg-gray-700"
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className={linkClass("/login")}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}