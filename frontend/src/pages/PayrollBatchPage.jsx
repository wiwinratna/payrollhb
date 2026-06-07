import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function PayrollBatchPage() {
  const navigate = useNavigate();
  const [periodMonth, setPeriodMonth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!periodMonth) {
      setError("Period month harus diisi");
      return;
    }

    setIsLoading(true);
    setError("");
    setResults(null);

    try {
      const data = await api("/payrolls/batch-generate", {
        method: "POST",
        body: { period_month: periodMonth },
      });
      setResults(data);
    } catch (err) {
      const msg = err.data?.message || err.message || "Terjadi kesalahan";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Batch Generate Auto Payroll</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hitung massal payroll karyawan mode auto untuk periode tertentu.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleGenerate} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Period Month (YYYY-MM) <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="mb-0.5">
            {isLoading ? "Generating..." : "Generate Batch"}
          </Button>
        </form>
        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
      </div>

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm text-center">
              <div className="text-sm font-semibold text-green-700">Total Success</div>
              <div className="text-3xl font-bold text-green-800 mt-2">{results.total_success}</div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm text-center">
              <div className="text-sm font-semibold text-red-700">Total Failed</div>
              <div className="text-3xl font-bold text-red-800 mt-2">{results.total_failed}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-800">Batch Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Employee ID</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.details?.length > 0 ? (
                    results.details.map((detail, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-medium text-slate-700">{detail.employee_id}</td>
                        <td className="px-6 py-4">
                          {detail.status === "success" ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {detail.status === "success" ? (
                            <button
                              onClick={() => navigate(`/payrolls/${detail.payroll_id}`)}
                              className="text-sky-600 hover:underline"
                            >
                              View Payroll (ID: {detail.payroll_id})
                            </button>
                          ) : (
                            detail.error || detail.message || "-"
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                        Tidak ada rincian yang ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
