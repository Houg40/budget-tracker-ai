"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { previewCsvImport, commitCsvImport } from "@/lib/api";
import { Account, CsvImportPreviewResponse } from "@/lib/types";

interface CsvImportProps {
  accounts: Account[];
  onImported: () => void;
}

export default function CsvImport({ accounts, onImported }: CsvImportProps) {
  const [accountId, setAccountId] = useState<number | null>(accounts[0]?.id ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvImportPreviewResponse | null>(null);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // `accounts` loads asynchronously in the parent, so on first render it's
  // often still empty and the line above locks accountId in as null. Keep it
  // synced to a valid account once the real list arrives (or if the
  // previously selected account gets deleted).
  useEffect(() => {
    if (accountId === null || !accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setExcludedRows(new Set());
    setError(null);
    setResultMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(reader.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!accountId || !csvText) return;
    try {
      setLoading(true);
      setError(null);
      setResultMessage(null);
      const result = await previewCsvImport(accountId, csvText);
      setPreview(result);
      // Duplicates are excluded by default — importing something already in
      // the account is much more likely to be a mistake than intentional.
      setExcludedRows(
        new Set(result.rows.filter((r) => r.status === "duplicate").map((r) => r.row_number))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview the file.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(rowNumber: number) {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  }

  async function handleImport() {
    if (!accountId || !preview) return;
    const toImport = preview.rows.filter(
      (r) => r.status !== "error" && !excludedRows.has(r.row_number)
    );
    if (toImport.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      await commitCsvImport(
        accountId,
        toImport.map((r) => ({
          description: r.description,
          amount: Number(r.amount),
          transaction_date: r.transaction_date as string,
        }))
      );
      setResultMessage(`Imported ${toImport.length} transaction${toImport.length === 1 ? "" : "s"}.`);
      setPreview(null);
      setCsvText(null);
      setFileName(null);
      setExcludedRows(new Set());
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import transactions.");
    } finally {
      setLoading(false);
    }
  }

  const includedCount = preview
    ? preview.rows.filter((r) => r.status !== "error" && !excludedRows.has(r.row_number)).length
    : 0;

  function statusLabel(status: string) {
    if (status === "valid") return "Ready";
    if (status === "duplicate") return "Possible duplicate";
    return "Error";
  }

  function statusColor(status: string) {
    if (status === "valid") return "text-green-400";
    if (status === "duplicate") return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">Import from CSV</h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 rounded p-3 mb-4">
          {error}
        </div>
      )}
      {resultMessage && (
        <div className="bg-green-900 border border-green-700 text-green-100 rounded p-3 mb-4">
          {resultMessage}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-400">Import into account</label>
          <select
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
            value={accountId ?? ""}
            onChange={(e) => setAccountId(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-400">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="text-sm text-gray-400 cursor-pointer file:cursor-pointer file:mr-3 file:h-9 file:rounded file:border-0 file:bg-blue-600 file:px-4 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500"
          />
        </div>
        <button
          onClick={handlePreview}
          disabled={!csvText || !accountId || loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded px-4 py-1 h-9"
        >
          Preview
        </button>
      </div>

      {fileName && !preview && <p className="text-sm text-gray-500 mb-4">Selected: {fileName}</p>}

      {preview && (
        <div>
          <p className="text-sm text-gray-400 mb-2">
            {preview.valid_count} ready, {preview.duplicate_count} possible duplicates, {preview.error_count} errors.
            Uncheck any rows you don&apos;t want to import.
          </p>
          <table className="w-full text-left border-collapse mb-4">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-sm">
                <th className="py-2"></th>
                <th className="py-2">Row</th>
                <th className="py-2">Date</th>
                <th className="py-2">Description</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.row_number} className="border-b border-gray-800">
                  <td className="py-2">
                    {r.status !== "error" && (
                      <input
                        type="checkbox"
                        checked={!excludedRows.has(r.row_number)}
                        onChange={() => toggleRow(r.row_number)}
                      />
                    )}
                  </td>
                  <td className="py-2 text-gray-500">{r.row_number}</td>
                  <td className="py-2">{r.transaction_date ?? "—"}</td>
                  <td className="py-2">{r.description || "—"}</td>
                  <td className="py-2">{r.amount ? `$${r.amount}` : "—"}</td>
                  <td className={`py-2 text-sm ${statusColor(r.status)}`}>
                    {statusLabel(r.status)}
                    {r.error_message ? `: ${r.error_message}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleImport}
            disabled={includedCount === 0 || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded px-4 py-1 h-9"
          >
            Import {includedCount} Transaction{includedCount === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </section>
  );
}