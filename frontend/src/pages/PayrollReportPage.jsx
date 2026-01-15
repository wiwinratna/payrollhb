import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function todayMonth() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function fmtRp(n) {
  const x = Number(n || 0);
  return x.toLocaleString("id-ID", { style: "currency", currency: "IDR" });
}

function StatusBadge({ status }) {
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
  return date.toLocaleString("id-ID", { month: "long", year: "numeric" });
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * ✅ OPSI URUTAN 1,2,3 di tabel (tanpa ID)
 * - No di UI: 1..N (idx+1)
 * - CSV juga pakai No urut (idx+1)
 * - Link Detail masih pakai r.id (aman, tapi tidak ditampilkan sebagai kolom)
 */

function toCsv(rows) {
  const headers = [
    "No",
    "EmployeeCode",
    "EmployeeName",
    "Periode",
    "Status",
    "GajiPokok",
    "Tunjangan",
    "Potongan",
    "Total",
    "Alg",
    "CreatedAt",
  ];

  const esc = (v) => {
    const s = String(v ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [];
  lines.push(headers.join(","));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    lines.push(
      [
        i + 1,
        r.employee_code,
        r.employee_name,
        r.periode,
        r.status,
        r.gaji_pokok,
        r.tunjangan,
        r.potongan,
        r.total,
        r.salary_alg,
        r.created_at,
      ]
        .map(esc)
        .join(",")
    );
  }

  return lines.join("\n");
}

export default function PayrollReportPage() {
  const nav = useNavigate();
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();

  const [month, setMonth] = useState(() => todayMonth());
  const [status, setStatus] = useState(""); // optional

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const summary = data?.summary || {};

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("month", month);
      if (status) qs.set("status", status);

      const res = await api(`/reports/payroll?${qs.toString()}`);
      setData(res);
    } catch (e) {
      setErr(e?.message || "Gagal memuat laporan payroll.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, status]);

  const title = useMemo(() => {
    const roleLabel = role === "fat" ? "Finance Admin" : "Director";
    return `Payroll Report • ${roleLabel}`;
  }, [role]);

  function exportCsv() {
    const csv = toCsv(rows);
    const file = `payroll-report-${month}${status ? `-${status}` : ""}.csv`;
    downloadText(file, csv);
  }

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
              <Badge className="rounded-full border border-slate-200 bg-white text-slate-700">
                {role || "-"}
              </Badge>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Laporan payroll (nominal ditampilkan) khusus <b>FAT</b> &{" "}
              <b>Director</b>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-600">
                Periode
              </div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="mt-1 w-[170px] bg-transparent text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-600">
                Status
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-[180px] bg-transparent text-sm font-bold text-slate-900 outline-none"
              >
                <option value="">Semua</option>
                <option value="draft">DRAFT</option>
                <option value="requested">REQUESTED</option>
                <option value="approved">APPROVED</option>
                <option value="paid">PAID</option>
                <option value="rejected">REJECTED</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={load}
              disabled={loading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Memuat..." : "Refresh"}
            </Button>

            <Button
              onClick={exportCsv}
              disabled={loading || rows.length === 0}
              className="rounded-2xl bg-slate-900 text-white font-extrabold hover:bg-slate-800"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
            <CardHeader>
              <CardTitle className="text-sm">Jumlah Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">
                {loading ? "…" : summary.count ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {monthLabel(month)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
            <CardHeader>
              <CardTitle className="text-sm">Total Gaji Pokok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-slate-900">
                {loading ? "…" : fmtRp(summary.sum_gaji_pokok ?? 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Akumulasi</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
            <CardHeader>
              <CardTitle className="text-sm">Total Tunjangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-slate-900">
                {loading ? "…" : fmtRp(summary.sum_tunjangan ?? 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Akumulasi</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
            <CardHeader>
              <CardTitle className="text-sm">Total Potongan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-slate-900">
                {loading ? "…" : fmtRp(summary.sum_potongan ?? 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Akumulasi</div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
            <CardHeader>
              <CardTitle className="text-sm">Total Dibayarkan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-slate-900">
                {loading ? "…" : fmtRp(summary.sum_total ?? 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Net (versi sistem kamu)
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Detail Payroll
              </div>
              <div className="text-xs text-slate-500">
                Periode {monthLabel(month)} •{" "}
                {status ? `Status: ${status.toUpperCase()}` : "Semua status"}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} data`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="px-8">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-[120px]">No</TableHead>
                    <TableHead className="text-slate-700 w-[320px]">
                      Pegawai
                    </TableHead>
                    <TableHead className="text-slate-700 w-[160px]">
                      Periode
                    </TableHead>
                    <TableHead className="text-slate-700 w-[160px]">
                      Status
                    </TableHead>

                    <TableHead className="text-slate-700 w-[200px] text-right">
                      Gaji Pokok
                    </TableHead>
                    <TableHead className="text-slate-700 w-[200px] text-right">
                      Tunjangan
                    </TableHead>
                    <TableHead className="text-slate-700 w-[200px] text-right">
                      Potongan
                    </TableHead>
                    <TableHead className="text-slate-700 w-[220px] text-right">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-slate-500"
                      >
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-slate-500"
                      >
                        Tidak ada data payroll untuk filter ini.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    rows.map((r, idx) => (
                      <TableRow
                        key={r.id} // react key internal
                        className={[
                          "transition align-middle",
                          idx % 2 === 0 ? "bg-white/40" : "bg-white/20",
                          "hover:bg-slate-50/80",
                        ].join(" ")}
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {idx + 1}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>
                              Alg: {String(r.salary_alg || "—").toUpperCase()}
                            </span>
                            <span className="text-slate-300">•</span>
                            <Link
                              to={`/payrolls/${r.id}`}
                              className="text-sky-700 hover:underline font-semibold"
                              title="Buka detail payroll"
                            >
                              Detail
                            </Link>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-slate-700">
                          <div className="font-semibold text-slate-900">
                            {r.employee_name || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.employee_code || "—"} • Employee ID:{" "}
                            {r.employee_id ?? "—"}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-slate-700">
                          {r.periode
                            ? new Date(r.periode).toLocaleString("id-ID", {
                                month: "long",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>

                        <TableCell className="py-4">
                          <StatusBadge status={r.status} />
                        </TableCell>

                        <TableCell className="py-4 text-right font-semibold text-slate-900">
                          {fmtRp(r.gaji_pokok)}
                        </TableCell>
                        <TableCell className="py-4 text-right font-semibold text-slate-900">
                          {fmtRp(r.tunjangan)}
                        </TableCell>
                        <TableCell className="py-4 text-right font-semibold text-slate-900">
                          {fmtRp(r.potongan)}
                        </TableCell>
                        <TableCell className="py-4 text-right font-black text-slate-900">
                          {fmtRp(r.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Human Plus Institute</span>
            <span>Payroll Report</span>
          </div>
        </div>

        {/* footer action */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
            onClick={() => nav(-1)}
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
