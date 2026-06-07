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

export default function ProjectsPage() {
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();
  const isHCGA = role === "hcga";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [form, setForm] = useState({
    code: "",
    name: "",
    client_name: "",
    location: "",
    city: "",
    is_outside_city: false,
    is_client_provide_meal: false,
    start_date: "",
    end_date: "",
    status: "active",
    description: "",
  });

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await api("/projects");
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal load data project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setForm({
      code: "",
      name: "",
      client_name: "",
      location: "",
      city: "",
      is_outside_city: false,
      is_client_provide_meal: false,
      start_date: "",
      end_date: "",
      status: "active",
      description: "",
    });
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEditModal = (r) => {
    setForm({
      code: r.code || "",
      name: r.name || "",
      client_name: r.client_name || "",
      location: r.location || "",
      city: r.city || "",
      is_outside_city: !!r.is_outside_city,
      is_client_provide_meal: !!r.is_client_provide_meal,
      start_date: r.start_date || "",
      end_date: r.end_date || "",
      status: r.status || "active",
      description: r.description || "",
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
        await api(`/projects/${editId}`, {
          method: "PUT",
          body: form,
        });
        setSuccess("Project berhasil diperbarui");
      } else {
        await api("/projects", {
          method: "POST",
          body: form,
        });
        setSuccess("Project baru berhasil dibuat");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setErr(err?.message || "Gagal menyimpan project");
    }
  };

  const onDelete = async (id) => {
    const ok = confirm("Apakah Anda yakin ingin menghapus project ini?");
    if (!ok) return;
    setErr("");
    setSuccess("");
    try {
      await api(`/projects/${id}`, { method: "DELETE" });
      setSuccess("Project berhasil dihapus");
      load();
    } catch (err) {
      setErr(err?.message || "Gagal menghapus project");
    }
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
              Projects
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Kelola data proyek perusahaan.
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
            {isHCGA && (
              <Button
                onClick={openAddModal}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                + Add Project
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

        {/* Table */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Project List</span>
            <span className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} projects`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="px-8">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-slate-700 pl-6 w-[120px]">Code</TableHead>
                    <TableHead className="text-slate-700 w-[200px]">Project Name</TableHead>
                    <TableHead className="text-slate-700 w-[150px]">Client</TableHead>
                    <TableHead className="text-slate-700 w-[150px]">Location</TableHead>
                    <TableHead className="text-slate-700 w-[100px]">Status</TableHead>
                    {isHCGA && (
                      <TableHead className="text-center text-slate-700 w-[160px] pr-6">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={isHCGA ? 6 : 5} className="py-12 text-center text-slate-500">
                        Loading data...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isHCGA ? 6 : 5} className="py-12 text-center text-slate-500">
                        Belum ada project yang terdaftar.
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
                          {r.code}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 py-4">
                          {r.name}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">
                          {r.client_name || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">
                          {r.city} {r.is_outside_city ? "(Luar Kota)" : ""}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className="rounded-full border border-slate-200 bg-white text-slate-700 uppercase">
                            {r.status}
                          </Badge>
                        </TableCell>
                        {isHCGA && (
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
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Modal Add/Edit */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative my-8">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                {isEdit ? "Edit Project" : "Add New Project"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Code</label>
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Client Name</label>
                    <input
                      value={form.client_name}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">City</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Location Details</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_outside_city"
                      checked={form.is_outside_city}
                      onChange={(e) => setForm({ ...form, is_outside_city: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500/40"
                    />
                    <label htmlFor="is_outside_city" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                      Outside City
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_client_provide_meal"
                      checked={form.is_client_provide_meal}
                      onChange={(e) => setForm({ ...form, is_client_provide_meal: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500/40"
                    />
                    <label htmlFor="is_client_provide_meal" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                      Client Provide Meal
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="2"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
                    Save Project
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
