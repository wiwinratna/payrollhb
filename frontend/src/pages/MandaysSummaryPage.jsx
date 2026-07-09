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
    <div>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="hidden">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-[10px] font-semibold text-muted-foreground">Phase 3</span>
            </div>

            <h1 className="mt-4 text-lg font-semibold text-foreground">
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
              className="bg-white border border-border rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            {isHCGA && (
              <Button
                onClick={openRecalculateModal}
                className="px-4 py-1.5 bg-blue-600 rounded text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + Recalculate Summary
              </Button>
            )}
          </div>
        </div>

        {err && (
          <div className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-600 border border-rose-100">
            {err}
          </div>
        )}

        {success && (
          <div className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-600 border border-emerald-100">
            {success}
          </div>
        )}

        <div className="bg-white border border-border rounded shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/70 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Summary List</span>
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
                          {r.period_from ? r.period_from.split('T')[0] : ""}<br/>{r.period_to ? r.period_to.split('T')[0] : ""}
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
            <div className="bg-white border border-border rounded shadow-sm p-4 my-4">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                Recalculate Summary
              </h2>

              <form onSubmit={handleRecalculate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Employee</label>
                  <select
                    value={recalcForm.employee_id}
                    onChange={(e) => setRecalcForm({ ...recalcForm, employee_id: e.target.value })}
                    required
                    className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
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
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Period Month</label>
                  <input
                    type="month"
                    value={recalcForm.period_month}
                    onChange={(e) => setRecalcForm({ ...recalcForm, period_month: e.target.value })}
                    required
                    className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecalcModalOpen(false)}
                    className="px-4 py-1.5 bg-white border border-border rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 rounded text-xs font-medium text-white hover:bg-blue-700 transition-colors"
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
