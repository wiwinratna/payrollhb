import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

function todayMonth() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function RoleBadge({ role }) {
  const r = String(role || "").toLowerCase();
  return (
    <Badge className="rounded-full border border-slate-200 bg-white text-slate-700">
      {r || "-"}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    active: "bg-emerald-50 border-emerald-200 text-emerald-700",
    inactive: "bg-rose-50 border-rose-200 text-rose-700",
  };
  const cls = map[s] || "bg-white border-slate-200 text-slate-700";
  return (
    <Badge className={`rounded-full border ${cls}`}>
      {s ? s.toUpperCase() : "—"}
    </Badge>
  );
}

function AlgBadge({ alg }) {
  const a = String(alg || "").toUpperCase();
  if (!a) return <span className="text-slate-400">—</span>;
  return (
    <Badge className="rounded-full border border-slate-200 bg-white text-slate-700">
      {a}
    </Badge>
  );
}

function PayrollStatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    draft: "bg-slate-50 border-slate-200 text-slate-700",
    requested: "bg-amber-50 border-amber-200 text-amber-700",
    approved: "bg-sky-50 border-sky-200 text-sky-700",
    paid: "bg-emerald-50 border-emerald-200 text-emerald-700",
    rejected: "bg-rose-50 border-rose-200 text-rose-700",
  };
  const cls = map[s] || "bg-white border-slate-200 text-slate-700";
  return (
    <Badge className={`rounded-full border ${cls}`}>
      {s ? s.toUpperCase() : "—"}
    </Badge>
  );
}

function monthLabel(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "—";
  const [y, m] = ym.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function periodeLabel(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();

  const [month, setMonth] = useState(() => todayMonth());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const isHCGA = role === "hcga";
  const isPayrollSummaryRole = role === "fat" || role === "director" || role === "staff";

  async function load() {
    setErr("");
    setLoading(true);
    try {
      let res;

      // ✅ ROLE BASED ENDPOINT
      if (isHCGA) {
        res = await api("/dashboard/hcga");
      } else if (isPayrollSummaryRole) {
        res = await api(`/dashboard/summary?month=${encodeURIComponent(month)}`);
      } else {
        // fallback: tetap coba summary
        res = await api(`/dashboard/summary?month=${encodeURIComponent(month)}`);
      }

      setData(res);
    } catch (e) {
      setErr(e?.message || "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // month cuma relevan buat summary (FAT/DIR/STAFF), tapi aman kalau HCGA pun ke-trigger
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, role]);

  // ===== HCGA data shape =====
  const hcgaCards = data?.cards || {};
  const hcgaLists = data?.lists || {};
  const noAccountList = Array.isArray(hcgaLists?.no_account) ? hcgaLists.no_account : [];
  const noSalaryList = Array.isArray(hcgaLists?.no_salary_profile) ? hcgaLists.no_salary_profile : [];

  // ===== summary data shape =====
  const kpi = data?.kpi || {};
  const recent = Array.isArray(data?.recent_payrolls) ? data.recent_payrolls : [];
  const trend = Array.isArray(data?.trend) ? data.trend : [];
  const algCounts = Array.isArray(data?.alg_counts) ? data.alg_counts : [];
  const statusCounts = Array.isArray(data?.status_counts) ? data.status_counts : [];

  const maxTrend = useMemo(() => {
    let mx = 0;
    for (const t of trend) mx = Math.max(mx, Number(t?.total || 0));
    return mx || 1;
  }, [trend]);

  return (
    <div className="relative">
      {/* bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.10),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_48%)]" />
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700">
                Human Plus Institute
              </span>
              <span className="text-xs text-slate-500">•</span>
              <RoleBadge role={role} />
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              Dashboard
            </h1>

            {isHCGA ? (
              <p className="mt-1 text-sm text-slate-600">
                Ringkasan <b>HR & onboarding</b> (employee & akun).
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">
                Ringkasan payroll per bulan (tanpa membocorkan nominal gaji).
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month hanya tampil untuk payroll summary */}
            {!isHCGA && (
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-600">Periode</div>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="mt-1 w-[170px] bg-transparent text-sm font-bold text-slate-900 outline-none"
                />
              </div>
            )}

            <Button
              variant="outline"
              onClick={load}
              disabled={loading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Memuat..." : "Refresh"}
            </Button>
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* =========================
            HCGA DASHBOARD
        ========================== */}
        {isHCGA ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Karyawan Aktif</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (hcgaCards.active ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Status: active</div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Karyawan Nonaktif</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (hcgaCards.inactive ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Status: inactive</div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Belum Punya Akun</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (hcgaCards.no_account ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Kandidat untuk Create Account
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Belum Ada Salary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (hcgaCards.no_salary_profile ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Kandidat untuk Set Salary
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
              <CardHeader>
                <CardTitle className="text-sm">HCGA Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild className="rounded-2xl bg-slate-900 text-white font-extrabold hover:bg-slate-800">
                  <Link to="/employees">Kelola Employees</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white hover:bg-slate-50">
                  <Link to="/accounts/create">Buat Akun Employee</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Top 5 • Belum Punya Akun</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-slate-500">Memuat…</div>
                  ) : noAccountList.length === 0 ? (
                    <div className="text-sm text-slate-500">Semua employee sudah punya akun ✅</div>
                  ) : (
                    <div className="space-y-2">
                      {noAccountList.map((e) => (
                        <div key={e.id} className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900">
                              {e.name} <span className="text-xs text-slate-500">• {e.employee_code}</span>
                            </div>
                            <StatusBadge status={e.status} />
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {e.department || "—"} • {e.position || "—"}
                          </div>
                          <div className="mt-2">
                            <Button asChild variant="outline" className="rounded-2xl border-slate-200 bg-white hover:bg-slate-50">
                              <Link to={`/employees/${e.id}`}>Lihat Detail</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Top 5 • Belum Ada Salary Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-slate-500">Memuat…</div>
                  ) : noSalaryList.length === 0 ? (
                    <div className="text-sm text-slate-500">Semua employee sudah punya salary ✅</div>
                  ) : (
                    <div className="space-y-2">
                      {noSalaryList.map((e) => (
                        <div key={e.id} className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-slate-900">
                              {e.name} <span className="text-xs text-slate-500">• {e.employee_code}</span>
                            </div>
                            <StatusBadge status={e.status} />
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {e.department || "—"} • {e.position || "—"}
                          </div>
                          <div className="mt-2">
                            <Button asChild className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110">
                              <Link to={`/employees/${e.id}/salary-profile/new`}>Set Salary</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          /* =========================
              PAYROLL SUMMARY DASHBOARD (FAT / DIRECTOR / STAFF)
          ========================== */
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Payroll Bulan Ini</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (kpi.payroll_count ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Jumlah payroll terbuat</div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Karyawan Aktif</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (kpi.employees_active ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Status: active</div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Karyawan Nonaktif</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black text-slate-900">
                    {loading ? "…" : (kpi.employees_inactive ?? 0)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Nonaktif seharusnya tidak bisa login
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status counts */}
            <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
              <CardHeader>
                <CardTitle className="text-sm">Status Payroll (bulan terpilih)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-slate-500">Memuat…</div>
                ) : statusCounts.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    Belum ada data status.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {statusCounts.map((s) => (
                      <Badge
                        key={`${s.status}-${s.total}`}
                        className="rounded-full border border-slate-200 bg-white text-slate-700"
                      >
                        {String(s.status || "UNKNOWN").toUpperCase()}: {s.total ?? 0}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 mt-3">
                  Flow: FAT request → Director approve/reject → FAT paid.
                </div>
              </CardContent>
            </Card>

            {/* Trend + Alg */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Trend Payroll (6 bulan)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-slate-500">Memuat…</div>
                  ) : trend.length === 0 ? (
                    <div className="text-sm text-slate-500">Belum ada data trend.</div>
                  ) : (
                    <div className="space-y-2">
                      {trend.map((t) => {
                        const val = Number(t?.total || 0);
                        const w = Math.round((val / maxTrend) * 100);
                        return (
                          <div key={t.month} className="flex items-center gap-3">
                            <div className="w-[88px] text-xs text-slate-600 font-semibold">
                              {monthLabel(t.month)}
                            </div>
                            <div className="flex-1">
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-sky-500"
                                  style={{ width: `${w}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-10 text-right text-xs font-semibold text-slate-700">
                              {val}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-3">
                    *Tanpa nominal, hanya jumlah payroll per bulan.
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
                <CardHeader>
                  <CardTitle className="text-sm">Algoritma Enkripsi Payroll</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-slate-500">Memuat…</div>
                  ) : algCounts.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      Data algoritma belum ada.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {algCounts.map((a) => (
                        <Badge
                          key={`${a.salary_alg}-${a.total}`}
                          className="rounded-full border border-slate-200 bg-white text-slate-700"
                        >
                          {String(a.salary_alg || "UNKNOWN").toUpperCase()}: {a.total ?? 0}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-3">
                    Aman karena hanya metadata enkripsi, bukan nominal gaji.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent payrolls */}
            <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Payroll Terbaru
                  </div>
                  <div className="text-xs text-slate-500">
                    Data terbaru pada periode terpilih.
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {loading ? "Memuat..." : `${recent.length} data`}
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="px-8">
                  <Table className="min-w-[1100px]">
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-slate-700 pl-6 w-[140px]">Payroll</TableHead>
                        <TableHead className="text-slate-700 w-[320px]">Pegawai</TableHead>
                        <TableHead className="text-slate-700 w-[200px]">Periode</TableHead>
                        <TableHead className="text-slate-700 w-[160px]">Status</TableHead>
                        <TableHead className="text-slate-700 w-[160px]">Alg</TableHead>
                        <TableHead className="text-slate-700 w-[260px]">Dibuat</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                            Loading...
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading && recent.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                            Belum ada payroll di periode ini.
                          </TableCell>
                        </TableRow>
                      )}

                      {!loading &&
                        recent.map((r, idx) => (
                          <TableRow
                            key={r.id}
                            className={[
                              "transition align-middle",
                              idx % 2 === 0 ? "bg-white/40" : "bg-white/20",
                              "hover:bg-slate-50/80",
                            ].join(" ")}
                          >
                            <TableCell className="pl-6 py-4 font-semibold text-slate-900">
                              <Link to={`/payrolls/${r.id}`} className="hover:underline">
                                #{r.id}
                              </Link>
                            </TableCell>

                            <TableCell className="py-4 text-slate-700">
                              <div className="font-semibold text-slate-900">
                                {r.employee_name || "—"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {r.employee_code || "—"} • Employee ID: {r.employee_id ?? "—"}
                              </div>
                            </TableCell>

                            <TableCell className="py-4 text-slate-700">
                              {periodeLabel(r.periode)}
                            </TableCell>

                            <TableCell className="py-4">
                              <PayrollStatusBadge status={r.status} />
                            </TableCell>

                            <TableCell className="py-4">
                              <AlgBadge alg={r.salary_alg} />
                            </TableCell>

                            <TableCell className="py-4 text-slate-700">
                              {r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                <span>© {new Date().getFullYear()} Human Plus Institute</span>
                <span>Payroll Dashboard</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
