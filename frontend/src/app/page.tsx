"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getTransactions,
  getCategories,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  createTransaction,
  updateTransactionCategory,
  deleteTransaction,
} from "@/lib/api";
import { Transaction, Category, Account } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Which account new transactions get added to.
  const [formAccountId, setFormAccountId] = useState<number | null>(null);
  // Which account's transactions are currently shown ("all" = every account combined).
  const [filterAccountId, setFilterAccountId] = useState<number | "all">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("checking");
  const [renamingAccountId, setRenamingAccountId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<number | null>(null);

  // Redirect to login once we know for sure there's no session — not before,
  // since authLoading being true just means "still checking."
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const accts = await getAccounts();
      setAccounts(accts);

      // If the account we were filtering/adding-to no longer exists (e.g. it
      // was just deleted), fall back to sensible defaults instead of holding
      // onto a stale, now-invalid id.
      const validFilterId: number | "all" =
        filterAccountId !== "all" && accts.some((a) => a.id === filterAccountId)
          ? filterAccountId
          : "all";
      if (validFilterId !== filterAccountId) {
        setFilterAccountId("all");
      }
      setFormAccountId((prev) =>
        prev && accts.some((a) => a.id === prev) ? prev : accts.length > 0 ? accts[0].id : null
      );

      const [cats, txns] = await Promise.all([
        getCategories(),
        getTransactions(validFilterId === "all" ? undefined : validFilterId),
      ]);
      setCategories(cats);
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading data.");
    } finally {
      setLoading(false);
    }
  }

  // Only load data once we actually have a logged-in user — otherwise this
  // would fire a doomed request right before the redirect above kicks in.
  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleFilterChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const parsed: number | "all" = value === "all" ? "all" : Number(value);
    setFilterAccountId(parsed);
    try {
      setError(null);
      const txns = await getTransactions(parsed === "all" ? undefined : parsed);
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions.");
    }
  }

  async function handleAddTransaction(e: FormEvent) {
    e.preventDefault();
    if (!description || !amount || !date || !formAccountId) return;

    try {
      await createTransaction({
        account_id: formAccountId,
        description,
        amount: parseFloat(amount),
        transaction_date: date,
      });
      setDescription("");
      setAmount("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction.");
    }
  }

  async function handleCategoryChange(transactionId: number, categoryId: number) {
    try {
      await updateTransactionCategory(transactionId, categoryId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category.");
    }
  }

  async function handleDelete(transactionId: number) {
    try {
      await deleteTransaction(transactionId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction.");
    }
  }

  async function handleAddAccount(e: FormEvent) {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      setError(null);
      await createAccount({ name: newAccountName.trim(), account_type: newAccountType });
      setNewAccountName("");
      setNewAccountType("checking");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    }
  }

  function startRename(account: Account) {
    setRenamingAccountId(account.id);
    setRenameValue(account.name);
  }

  function cancelRename() {
    setRenamingAccountId(null);
    setRenameValue("");
  }

  async function handleRenameSave(accountId: number) {
    if (!renameValue.trim()) return;
    try {
      setError(null);
      await updateAccount(accountId, { name: renameValue.trim() });
      setRenamingAccountId(null);
      setRenameValue("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename account.");
    }
  }

  async function handleDeleteAccount(accountId: number) {
    try {
      setError(null);
      await deleteAccount(accountId);
      setConfirmDeleteAccountId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
      setConfirmDeleteAccountId(null);
    }
  }

  function categoryName(categoryId: number | null) {
    if (categoryId === null) return "Uncategorized";
    return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
  }

  function accountName(accountId: number) {
    return accounts.find((a) => a.id === accountId)?.name ?? "Unknown";
  }

  function accountTypeLabel(type: string) {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  // While we're still checking the session, or about to redirect a logged-out
  // visitor, don't flash the full page — just show a minimal placeholder.
  if (authLoading || !user) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Budget Tracker</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 rounded p-3 mb-4">
          {error}
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Accounts</h2>
        <ul>
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 border-b border-gray-800 py-2">
              {renamingAccountId === a.id ? (
                <>
                  <input
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 flex-1 max-w-xs"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRenameSave(a.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Save
                    </button>
                    <button onClick={cancelRename} className="text-gray-400 hover:text-gray-300 text-sm">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="font-medium">{a.name}</span>
                    <span className="text-gray-500 text-sm ml-2">{accountTypeLabel(a.account_type)}</span>
                  </div>
                  {confirmDeleteAccountId === a.id ? (
                    <div className="flex gap-3 items-center">
                      <span className="text-sm text-gray-400">Delete this account?</span>
                      <button
                        onClick={() => handleDeleteAccount(a.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteAccountId(null)}
                        className="text-gray-400 hover:text-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => startRename(a)} className="text-gray-400 hover:text-white text-sm">
                        Rename
                      </button>
                      <button
                        onClick={() => setConfirmDeleteAccountId(a.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddAccount} className="flex flex-wrap gap-2 items-end mt-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">New account name</label>
            <input
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-400">Type</label>
            <select
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-1 h-9">
            Add Account
          </button>
        </form>
      </section>

      <div className="flex flex-col mb-4">
        <label className="text-sm text-gray-400">Viewing</label>
        <select
          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-56"
          value={filterAccountId}
          onChange={handleFilterChange}
        >
          <option value="all">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleAddTransaction} className="flex flex-wrap gap-2 mb-8 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-gray-400">Account</label>
          <select
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            value={formAccountId ?? ""}
            onChange={(e) => setFormAccountId(Number(e.target.value))}
            required
          >
            {accounts.length === 0 && <option value="">No accounts</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-400">Description</label>
          <input
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-400">Amount</label>
          <input
            type="number"
            step="0.01"
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-28"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-400">Date</label>
          <input
            type="date"
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={!formAccountId}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded px-4 py-1 h-9"
        >
          Add Transaction
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-sm">
              <th className="py-2">Date</th>
              <th className="py-2">Account</th>
              <th className="py-2">Description</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Category</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-gray-800">
                <td className="py-2">{t.transaction_date}</td>
                <td className="py-2">{accountName(t.account_id)}</td>
                <td className="py-2">{t.description}</td>
                <td className="py-2">${t.amount}</td>
                <td className="py-2">
                  <select
                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                    value={t.category_id ?? ""}
                    onChange={(e) => handleCategoryChange(t.id, Number(e.target.value))}
                  >
                    <option value="" disabled>
                      {categoryName(t.category_id)}
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2">
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}