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

export default function SchedulesPage() {
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();
  const isHCGA = role === "hcga";

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [form, setForm] = useState({
    employee_id: "",
    schedule_date: "",
    schedule_type: "project",
    project_id: "",
    location: "",
    notes: "",
  });

  async function loadData() {
    setErr("");
    setLoading(true);
    try {
      const [schedData, empData, projData] = await Promise.all([
        api("/schedules"),
        fetchEmployeesLite("active"),
        api("/projects")
      ]);
      setRows(Array.isArray(schedData) ? schedData : schedData?.data ?? []);
      setEmployees(Array.isArray(empData) ? empData : empData?.data ?? []);
      setProjects(Array.isArray(projData) ? projData : projData?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal load data schedules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setForm({
      employee_id: "",
      schedule_date: "",
      schedule_type: "project",
      project_id: "",
      location: "",
      notes: "",
    });
    setIsEdit(false);
    setModalOpen(true);
  };

  const openEditModal = (r) => {
    setForm({
      employee_id: r.employee_id || "",
      schedule_date: r.schedule_date || "",
      schedule_type: r.schedule_type || "project",
      project_id: r.project_id || "",
      location: r.location || "",
      notes: r.notes || "",
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
      const payload = {
        employee_id: Number(form.employee_id),
        schedule_date: form.schedule_date,
        schedule_type: form.schedule_type,
        project_id: form.schedule_type === "project" ? Number(form.project_id) : null,
        location: form.location,
        notes: form.notes,
      };

      if (isEdit) {
        await api(`/schedules/${editId}`, {
          method: "PUT",
          body: payload,
        });
        setSuccess("Schedule berhasil diperbarui");
      } else {
        await api("/schedules", {
          method: "POST",
          body: payload,
        });
        setSuccess("Schedule baru berhasil dibuat");
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal menyimpan schedule");
    }
  };

  const onDelete = async (id) => {
    const ok = confirm("Apakah Anda yakin ingin menghapus schedule ini?");
    if (!ok) return;
    setErr("");
    setSuccess("");
    try {
      await api(`/schedules/${id}`, { method: "DELETE" });
      setSuccess("Schedule berhasil dihapus");
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal menghapus schedule");
    }
  };

  const getEmpName = (id) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.employee_code} - ${e.name}` : id;
  };

  const getProjName = (id) => {
    if (!id) return "-";
    const p = projects.find((x) => x.id === id);
    return p ? p.name : id;
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
              Schedules
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Kelola jadwal penugasan harian karyawan.
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
                onClick={openAddModal}
                className="px-4 py-1.5 bg-blue-600 rounded text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                + Add Schedule
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
            <span className="text-sm font-medium text-foreground">Schedule List</span>
            <span className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} schedules`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="px-8">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-slate-700 pl-6 w-[200px]">Employee</TableHead>
                    <TableHead className="text-slate-700 w-[120px]">Date</TableHead>
                    <TableHead className="text-slate-700 w-[120px]">Type</TableHead>
                    <TableHead className="text-slate-700 w-[150px]">Project</TableHead>
                    <TableHead className="text-slate-700 w-[150px]">Location</TableHead>
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
                        Belum ada jadwal terdaftar.
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
                        <TableCell className="text-slate-600 py-4">
                          {r.schedule_date}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className="rounded-full border border-slate-200 bg-white text-slate-700 uppercase">
                            {r.schedule_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">
                          {getProjName(r.project_id)}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">
                          {r.location || "-"}
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

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white border border-border rounded shadow-sm p-4 my-4">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                {isEdit ? "Edit Schedule" : "Add New Schedule"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Employee</label>
                  <select
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Schedule Date</label>
                    <input
                      type="date"
                      value={form.schedule_date}
                      onChange={(e) => setForm({ ...form, schedule_date: e.target.value })}
                      required
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Schedule Type</label>
                    <select
                      value={form.schedule_type}
                      onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                      required
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    >
                      <option value="project">Project</option>
                      <option value="ho_wfo">HO WFO</option>
                      <option value="ho_wfh">HO WFH</option>
                      <option value="training">Training</option>
                      <option value="leave">Leave</option>
                      <option value="holiday">Holiday</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                </div>

                {form.schedule_type === "project" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Project</label>
                    <select
                      value={form.project_id}
                      onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                      required={form.schedule_type === "project"}
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    >
                      <option value="">-- Pilih Project --</option>
                      {projects.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.code} - {proj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows="2"
                    className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-1.5 bg-white border border-border rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 rounded text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Save Schedule
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
