import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
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

export default function GradeManagementPage() {
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();
  const isHCGA = role === "hcga";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    level: 1,
    description: "",
    is_active: true,
  });

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await api("/master/grades");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Gagal load data grade");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isHCGA) {
      load();
    }
  }, []); // eslint-disable-line

  const openAddModal = () => {
    setForm({
      code: "",
      name: "",
      level: rows.length > 0 ? Math.max(...rows.map((r) => r.level)) + 1 : 1,
      description: "",
      is_active: true,
    });
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEditModal = (r) => {
    setForm({
      code: r.code,
      name: r.name,
      level: r.level,
      description: r.description || "",
      is_active: r.is_active,
    });
    setEditId(r.id);
    setIsEdit(true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSuccess("");
    try {
      if (isEdit) {
        const updated = await api(`/master/grades/${editId}`, {
          method: "PUT",
          body: form,
        });
        setRows((prev) => prev.map((x) => (x.id === editId ? updated : x)));
        setSuccess("Grade berhasil diperbarui");
      } else {
        const created = await api("/master/grades", {
          method: "POST",
          body: form,
        });
        setRows((prev) => [...prev, created].sort((a, b) => a.level - b.level));
        setSuccess("Grade baru berhasil dibuat");
      }
      setModalOpen(false);
    } catch (err) {
      setErr(err?.message || "Gagal menyimpan grade");
    }
  };

  const onDelete = async (id) => {
    const ok = confirm("Apakah Anda yakin ingin menghapus grade ini?");
    if (!ok) return;
    setErr("");
    setSuccess("");
    try {
      await api(`/master/grades/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((x) => x.id !== id));
      setSuccess("Grade berhasil dihapus");
    } catch (err) {
      setErr(err?.message || "Gagal menghapus grade");
    }
  };

  if (!isHCGA) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Forbidden: Anda tidak memiliki akses ke halaman ini. Halaman ini hanya untuk HCGA.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-3xl" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700">Master Data</span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              Grade Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Kelola level jabatan karyawan (BOD, PM, PD, dll) beserta tingkatan level hierarkinya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={load}
              disabled={loading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              onClick={openAddModal}
              className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
            >
              + Add Grade
            </Button>
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

        {/* Grades Table */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Grade List</span>
            <span className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} grade`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="px-8">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-slate-700 pl-6 w-[120px]">Code</TableHead>
                    <TableHead className="text-slate-700 w-[200px]">Name</TableHead>
                    <TableHead className="text-slate-700 w-[100px]">Level</TableHead>
                    <TableHead className="text-slate-700 w-[300px]">Description</TableHead>
                    <TableHead className="text-slate-700 w-[120px]">Status</TableHead>
                    <TableHead className="text-center text-slate-700 w-[160px] pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                        Loading data...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                        Belum ada grade yang terdaftar.
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
                        <TableCell className="pl-6 py-4 font-bold text-sky-700 uppercase">
                          {r.code}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 py-4">
                          {r.name}
                        </TableCell>
                        <TableCell className="font-semibold text-indigo-700 py-4">
                          Level {r.level}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4 max-w-[300px] truncate">
                          {r.description || "-"}
                        </TableCell>
                        <TableCell className="py-4">
                          {r.is_active ? (
                            <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 pr-6">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                              onClick={() => openEditModal(r)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-xl"
                              onClick={() => onDelete(r.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Modal Add/Edit */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                {isEdit ? "Edit Grade" : "Add New Grade"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Grade Code
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    disabled={isEdit}
                    placeholder="e.g. staff, pm, pd"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Project Manager"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Hierarchy Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Nilai terkecil (1) mewakili tingkatan tertinggi (e.g. BOD).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Keterangan tambahan..."
                    rows="3"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500/40"
                  />
                  <label htmlFor="is_active" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                    Grade is Active
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="rounded-2xl border-slate-200 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
                  >
                    Save Grade
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
