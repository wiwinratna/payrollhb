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
    setModalOpen(true);
  };

  const openEditModal = (r) => {
    setForm({
      employee_id: r.employee_id || "",
      attendance_date: r.attendance_date || "",
      attendance_type: r.attendance_type || "ho_wfo",
      project_id: r.project_id || "",
      schedule_id: r.schedule_id || "",
      check_in: r.check_in || "",
      check_out: r.check_out || "",
      overtime_hours: r.overtime_hours ?? "",
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
        attendance_date: form.attendance_date,
        attendance_type: form.attendance_type,
        project_id: form.attendance_type === "project" ? Number(form.project_id) : null,
        schedule_id: form.schedule_id ? Number(form.schedule_id) : null,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        overtime_hours: form.overtime_hours === "" ? null : Number(form.overtime_hours),
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
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            {isHCGA && (
              <Button
                onClick={openAddModal}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                + Add Attendance
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
            <span className="text-sm font-semibold text-slate-900">Attendance List</span>
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
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 relative my-8">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                {isEdit ? "Edit Attendance" : "Add New Attendance"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Employee</label>
                    <select
                      value={form.employee_id}
                      onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
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
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Attendance Date</label>
                    <input
                      type="date"
                      value={form.attendance_date}
                      onChange={(e) => setForm({ ...form, attendance_date: e.target.value })}
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Attendance Type</label>
                    <select
                      value={form.attendance_type}
                      onChange={(e) => setForm({ ...form, attendance_type: e.target.value })}
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
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
                      <label className="block text-sm font-semibold text-slate-800 mb-1">Project</label>
                      <select
                        value={form.project_id}
                        onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                        required={form.attendance_type === "project"}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
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
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Schedule ID (Opsional)</label>
                    <select
                      value={form.schedule_id}
                      onChange={(e) => setForm({ ...form, schedule_id: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
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
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Overtime Hours (Opsional)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.overtime_hours}
                      onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Check In (Opsional)</label>
                    <input
                      type="time"
                      value={form.check_in}
                      onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Check Out (Opsional)</label>
                    <input
                      type="time"
                      value={form.check_out}
                      onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                    Save Attendance
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
