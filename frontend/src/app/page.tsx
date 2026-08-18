"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  getTransactions,
  getCategories,
  createTransaction,
  updateTransactionCategory,
  deleteTransaction,
} from "@/lib/api";
import { Transaction, Category } from "@/lib/types";

const DEFAULT_ACCOUNT_ID = 1;

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [txns, cats] = await Promise.all([getTransactions(), getCategories()]);
      setTransactions(txns);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddTransaction(e: FormEvent) {
    e.preventDefault();
    if (!description || !amount || !date) return;

    try {
      await createTransaction({
        account_id: DEFAULT_ACCOUNT_ID,
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

  function categoryName(categoryId: number | null) {
    if (categoryId === null) return "Uncategorized";
    return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Budget Tracker</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 rounded p-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleAddTransaction} className="flex flex-wrap gap-2 mb-8 items-end">
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
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-1 h-9">
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