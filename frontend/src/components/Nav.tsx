"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `px-3 py-2 rounded text-sm ${
      pathname === href ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
    }`;

  return (
    <nav className="bg-black border-b border-gray-800 px-8 py-3 flex gap-2">
      <Link href="/" className={linkClass("/")}>
        Transactions
      </Link>
      <Link href="/dashboard" className={linkClass("/dashboard")}>
        Dashboard
      </Link>
    </nav>
  );
}