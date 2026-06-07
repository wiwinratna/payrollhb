import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { fetchEmployeesLite } from "@/lib/payrollsApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default function MandaysSummaryPage() {
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();
  const isHCGA = role === "hcga";

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [recalcModalOpen, setRecalcModalOpen] = useState(false);
  const [recalcForm, setRecalcForm] = useState({
    employee_id: "",
    period_month: "",
  });

  async function loadData() {
    setErr("");
    setLoading(true);
    try {
      const [sumData, empData] = await Promise.all([
        api("/mandays-summaries"),
        fetchEmployeesLite("active"),
      ]);
      setRows(Array.isArray(sumData) ? sumData : sumData?.data ?? []);
      setEmployees(Array.isArray(empData) ? empData : empData?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal load data mandays summary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openRecalculateModal = () => {
    setRecalcForm({
      employee_id: "",
      period_month: "",
    });
    setRecalcModalOpen(true);
  };

  const handleRecalculate = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess("");
    try {
      await api("/mandays-summaries/recalculate", {
        method: "POST",
        body: {
          employee_id: Number(recalcForm.employee_id),
          period_month: recalcForm.period_month,
        },
      });
      setSuccess("Recalculate mandays berhasil.");
      setRecalcModalOpen(false);
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal melakukan recalculate");
    }
  };

  const handleFinalize = async (id) => {
    const ok = confirm("Finalize mandays ini? Data tidak bisa diubah setelah final.");
    if (!ok) return;
    setErr("");
    setSuccess("");
    try {
      await api(`/mandays-summaries/${id}/finalize`, { method: "POST" });
      setSuccess("Mandays berhasil difinalisasi.");
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal finalisasi mandays");
    }
  };

  const handleUnfinalize = async (id) => {
    const ok = confirm("Unfinalize mandays ini?");
    if (!ok) return;
    setErr("");
    setSuccess("");
    try {
      await api(`/mandays-summaries/${id}/unfinalize`, { method: "POST" });
      setSuccess("Mandays berhasil di-unfinalize.");
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal unfinalize mandays");
    }
  };

  const getEmpName = (id) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.employee_code} - ${e.name}` : id;
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-3xl" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700">Phase 3</span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              Mandays Summary
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Rangkuman kehadiran dan penugasan karyawan per periode bulanan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            {isHCGA && (
              <Button
                onClick={openRecalculateModal}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                + Recalculate Summary
              </Button>
            )}
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Summary List</span>
            <span className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} records`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="px-8">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-slate-700 pl-6 w-[200px]">Employee</TableHead>
                    <TableHead className="text-slate-700 w-[100px]">Period</TableHead>
                    <TableHead className="text-slate-700 w-[150px]">From - To</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">Proj</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">WFO</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">WFH</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">Out</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">Trn</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">Lev</TableHead>
                    <TableHead className="text-slate-700 font-bold w-[100px]">Total</TableHead>
                    <TableHead className="text-slate-700 w-[80px]">Trips</TableHead>
                    <TableHead className="text-slate-700 w-[100px]">Status</TableHead>
                    {isHCGA && (
                      <TableHead className="text-center text-slate-700 w-[180px] pr-6">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={isHCGA ? 13 : 12} className="py-12 text-center text-slate-500">
                        Loading data...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isHCGA ? 13 : 12} className="py-12 text-center text-slate-500">
                        Belum ada mandays summary.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    rows.map((r, idx) => (
                      <TableRow
                        key={r.id}
                        className={[
                          "transition align-middle",
                          idx % 2 === 0 ? "bg-white/40" : "bg-white/20",
                          "hover:bg-slate-50/80",
                        ].join(" ")}
                      >
                        <TableCell className="pl-6 py-4 font-bold text-sky-700">
                          {r.employee?.name || getEmpName(r.employee_id)}
                        </TableCell>
                        <TableCell className="text-slate-900 py-4 font-semibold">
                          {r.period_month}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4 text-xs">
                          {r.period_from}<br/>{r.period_to}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">{r.mandays_project ?? 0}</TableCell>
                        <TableCell className="text-slate-600 py-4">{r.mandays_ho_wfo ?? 0}</TableCell>
                        <TableCell className="text-slate-600 py-4">{r.mandays_ho_wfh ?? 0}</TableCell>
                        <TableCell className="text-slate-600 py-4">{r.mandays_outside_city ?? 0}</TableCell>
                        <TableCell className="text-slate-600 py-4">{r.mandays_training ?? 0}</TableCell>
                        <TableCell className="text-slate-600 py-4">{r.mandays_leave ?? 0}</TableCell>
                        <TableCell className="text-slate-900 py-4 font-bold">{r.total_mandays ?? 0}</TableCell>
                        <TableCell className="text-slate-600 py-4">{r.num_trips ?? 0}</TableCell>
                        <TableCell className="py-4">
                          {r.is_finalized ? (
                            <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Final</Badge>
                          ) : (
                            <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700">Draft</Badge>
                          )}
                        </TableCell>
                        {isHCGA && (
                          <TableCell className="py-4 pr-6">
                            <div className="flex justify-center gap-2">
                              {!r.is_finalized ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleFinalize(r.id)}
                                >
                                  Finalize
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleUnfinalize(r.id)}
                                >
                                  Unfinalize
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {recalcModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative my-8">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                Recalculate Summary
              </h2>

              <form onSubmit={handleRecalculate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Employee</label>
                  <select
                    value={recalcForm.employee_id}
                    onChange={(e) => setRecalcForm({ ...recalcForm, employee_id: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  >
                    <option value="">-- Pilih Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code} - {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Period Month</label>
                  <input
                    type="month"
                    value={recalcForm.period_month}
                    onChange={(e) => setRecalcForm({ ...recalcForm, period_month: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecalcModalOpen(false)}
                    className="rounded-2xl border-slate-200 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
                  >
                    Recalculate
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
