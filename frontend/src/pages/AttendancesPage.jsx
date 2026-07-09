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

export default function AttendancesPage() {
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();
  const isHCGA = role === "hcga";

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    employee_id: "",
    attendance_date: "",
    attendance_type: "ho_wfo",
    project_id: "",
    schedule_id: "",
    check_in: "",
    check_out: "",
    overtime_hours: "",
    notes: "",
  });

  async function loadData() {
    setErr("");
    setLoading(true);
    try {
      const [attData, empData, projData, schedData] = await Promise.all([
        api("/attendances"),
        fetchEmployeesLite("active"),
        api("/projects"),
        api("/schedules")
      ]);
      setRows(Array.isArray(attData) ? attData : attData?.data ?? []);
      setEmployees(Array.isArray(empData) ? empData : empData?.data ?? []);
      setProjects(Array.isArray(projData) ? projData : projData?.data ?? []);
      setSchedules(Array.isArray(schedData) ? schedData : schedData?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal load data attendances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatTimeForInput = (dt) => {
    if (!dt) return "";
    try {
      const parts = dt.split(" ");
      if (parts.length === 2) return parts[1].substring(0, 5);
      return dt.substring(0, 5);
    } catch (e) {
      return "";
    }
  };

  const openAddModal = () => {
    setForm({
      employee_id: "",
      attendance_date: "",
      attendance_type: "ho_wfo",
      project_id: "",
      schedule_id: "",
      check_in: "",
      check_out: "",
      overtime_hours: "",
      notes: "",
    });
    setIsEdit(false);
    setErr("");
    setModalOpen(true);
  };

  const openEditModal = (r) => {
    setForm({
      employee_id: r.employee_id || "",
      attendance_date: r.attendance_date || "",
      attendance_type: r.attendance_type || "ho_wfo",
      project_id: r.project_id || "",
      schedule_id: r.schedule_id || "",
      check_in: formatTimeForInput(r.check_in),
      check_out: formatTimeForInput(r.check_out),
      overtime_hours: r.overtime_hours ?? "",
      notes: r.notes || "",
    });
    setEditId(r.id);
    setIsEdit(true);
    setErr("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErr("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const payload = {
        employee_id: Number(form.employee_id),
        attendance_date: form.attendance_date,
        attendance_type: form.attendance_type,
        project_id: form.attendance_type === "project" ? Number(form.project_id) : null,
        schedule_id: form.schedule_id ? Number(form.schedule_id) : null,
        check_in: form.check_in ? `${form.attendance_date} ${form.check_in}:00` : null,
        check_out: form.check_out ? `${form.attendance_date} ${form.check_out}:00` : null,
        overtime_hours: form.overtime_hours === "" || form.overtime_hours == null ? 0 : Number(form.overtime_hours),
        notes: form.notes,
      };

      if (isEdit) {
        await api(`/attendances/${editId}`, {
          method: "PUT",
          body: payload,
        });
        setSuccess("Attendance berhasil diperbarui");
      } else {
        await api("/attendances", {
          method: "POST",
          body: payload,
        });
        setSuccess("Attendance baru berhasil dibuat");
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal menyimpan attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    const ok = confirm("Apakah Anda yakin ingin menghapus attendance ini?");
    if (!ok) return;
    setErr("");
    setSuccess("");
    try {
      await api(`/attendances/${id}`, { method: "DELETE" });
      setSuccess("Attendance berhasil dihapus");
      loadData();
    } catch (err) {
      setErr(err?.message || err?.data?.message || "Gagal menghapus attendance");
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
              Attendances
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Kelola data kehadiran harian karyawan.
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
                + Add Attendance
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
            <span className="text-sm font-medium text-foreground">Attendance List</span>
            <span className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} attendances`}
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
                    <TableHead className="text-slate-700 w-[150px]">Time</TableHead>
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
                        Belum ada absensi terdaftar.
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
                          {r.attendance_date}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className="rounded-full border border-slate-200 bg-white text-slate-700 uppercase">
                            {r.attendance_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">
                          {getProjName(r.project_id)}
                        </TableCell>
                        <TableCell className="text-slate-600 py-4">
                          {r.check_in || "-"} / {r.check_out || "-"}
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
            <div className="bg-white border border-border rounded shadow-sm p-4 my-4 max-w-2xl w-full">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {isEdit ? "Edit Attendance" : "Add New Attendance"}
              </h2>

              {err && (
                <div className="mb-4 rounded bg-rose-50 px-3 py-2 text-xs text-rose-600 border border-rose-100">
                  {err}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Attendance Date</label>
                    <input
                      type="date"
                      value={form.attendance_date}
                      onChange={(e) => setForm({ ...form, attendance_date: e.target.value })}
                      required
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Attendance Type</label>
                    <select
                      value={form.attendance_type}
                      onChange={(e) => setForm({ ...form, attendance_type: e.target.value })}
                      required
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    >
                      <option value="project">Project</option>
                      <option value="ho_wfo">HO WFO</option>
                      <option value="ho_wfh">HO WFH</option>
                      <option value="training">Training</option>
                      <option value="outside_city">Outside City</option>
                      <option value="leave">Leave</option>
                      <option value="absent">Absent</option>
                      <option value="holiday">Holiday</option>
                    </select>
                  </div>

                  {form.attendance_type === "project" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">Project</label>
                      <select
                        value={form.project_id}
                        onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                        required={form.attendance_type === "project"}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Schedule ID (Opsional)</label>
                    <select
                      value={form.schedule_id}
                      onChange={(e) => setForm({ ...form, schedule_id: e.target.value })}
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    >
                      <option value="">-- Tidak Terhubung Jadwal --</option>
                      {schedules.filter(s => s.employee_id == form.employee_id && s.schedule_date == form.attendance_date).map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.schedule_type} {sch.project_id ? `(Proj: ${sch.project_id})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Overtime Hours (Opsional)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.overtime_hours}
                      onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })}
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Check In (Opsional)</label>
                    <input
                      type="time"
                      value={form.check_in}
                      onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">Check Out (Opsional)</label>
                    <input
                      type="time"
                      value={form.check_out}
                      onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                      className="w-full border border-border rounded bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                    />
                  </div>
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
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-white border border-border rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-blue-600 rounded text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Attendance"}
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
