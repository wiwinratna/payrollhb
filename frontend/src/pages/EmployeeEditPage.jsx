import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { getUser, updateAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function EmployeeEditPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const user = getUser();
  const role = String(user?.role || "").toLowerCase();
  const canManage = role === "hcga";

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    employee_code: "",
    name: "",
    department: "",
    position: "",
    status: "active",

    // Phase 1 fields
    grade_id: "",
    employment_type_id: "",
    work_basis_id: "",
    num_toddlers: 0,
    is_trainer: false,
    is_on_probation: false,

    nik: "",
    npwp: "",
    phone: "",
    address: "",

    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
  });

  const [grades, setGrades] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [workBases, setWorkBases] = useState([]);

  // 🔒 Guard
  useEffect(() => {
    if (!canManage) nav("/employees", { replace: true });
  }, [canManage, nav]);

  // 📥 Load employee and master lists
  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const [data, gradesList, empTypesList, workBasesList] = await Promise.all([
          api(`/employees/${id}`),
          api("/master/grades"),
          api("/master/employment-types"),
          api("/master/work-bases"),
        ]);

        setGrades(Array.isArray(gradesList) ? gradesList : []);
        setEmploymentTypes(Array.isArray(empTypesList) ? empTypesList : []);
        setWorkBases(Array.isArray(workBasesList) ? workBasesList : []);

        setForm({
          employee_code: data.employee_code ?? "",
          name: data.name ?? "",
          department: data.department ?? "",
          position: data.position ?? "",
          status: data.status ?? "active",

          // Phase 1 fields
          grade_id: data.grade_id ?? "",
          employment_type_id: data.employment_type_id ?? "",
          work_basis_id: data.work_basis_id ?? "",
          num_toddlers: data.num_toddlers ?? 0,
          is_trainer: !!data.is_trainer,
          is_on_probation: !!data.is_on_probation,

          nik: data.nik ?? "",
          npwp: data.npwp ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",

          bank_name: data.bank_name ?? "",
          bank_account_name: data.bank_account_name ?? "",
          bank_account_number: data.bank_account_number ?? "",
        });
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);

    try {
      await api(`/employees/${id}`, {
        method: "PUT",
        body: {
          ...form,
          department: form.department || null,
          position: form.position || null,
          grade_id: form.grade_id ? parseInt(form.grade_id) : null,
          employment_type_id: form.employment_type_id ? parseInt(form.employment_type_id) : null,
          work_basis_id: form.work_basis_id ? parseInt(form.work_basis_id) : null,
          num_toddlers: parseInt(form.num_toddlers) || 0,
          is_trainer: !!form.is_trainer,
          is_on_probation: !!form.is_on_probation,
          nik: form.nik || null,
          npwp: form.npwp || null,
          phone: form.phone || null,
          address: form.address || null,
          bank_name: form.bank_name || null,
          bank_account_name: form.bank_account_name || null,
          bank_account_number: form.bank_account_number || null,
        },
      });

      // sync header user name if this employee matches currently logged in user
      try {
        const me = await api("/me");
        updateAuthUser({ name: me?.name, role: me?.role });
      } catch {
        updateAuthUser({ name: form.name });
      }

      nav(`/employees/${id}`, { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/35 blur-3xl" />
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
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              Edit Employee
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Perbarui data pegawai untuk kebutuhan payroll dan administrasi.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
            onClick={() => nav(-1)}
          >
            Back
          </Button>
        </div>

        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* Form Card */}
        <Card className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
          <CardHeader>
            <CardTitle className="text-base">Employee Form</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Loading data...</p>
            ) : (
              <form onSubmit={submit} className="space-y-8">
                {/* BASIC */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Basic Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Employee Code"
                      value={form.employee_code}
                      required
                      readOnly
                      disabled
                      onChange={() => {}}
                    />
                    <Input
                      label="Name"
                      value={form.name}
                      required
                      onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                    />
                    <Input
                      label="Department"
                      value={form.department}
                      onChange={(v) => setForm((p) => ({ ...p, department: v }))}
                    />
                    <Input
                      label="Position"
                      value={form.position}
                      onChange={(v) => setForm((p) => ({ ...p, position: v }))}
                    />
                  </div>

                  <Select
                    label="Status"
                    value={form.status}
                    options={["active", "inactive"]}
                    onChange={(v) => setForm((p) => ({ ...p, status: v }))}
                  />
                </section>

                <div className="h-px bg-slate-200/70" />

                {/* KEPEGAWAIAN & PAYROLL */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Employment & Payroll Details (Fase 1)</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Grade / Jabatan Level</label>
                      <select
                        value={form.grade_id}
                        onChange={(e) => setForm((p) => ({ ...p, grade_id: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                      >
                        <option value="">-- Pilih Grade --</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.code.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Tipe Hubungan Kerja (Employment Type)</label>
                      <select
                        value={form.employment_type_id}
                        onChange={(e) => setForm((p) => ({ ...p, employment_type_id: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                      >
                        <option value="">-- Pilih Tipe --</option>
                        {employmentTypes.map((et) => (
                          <option key={et.id} value={et.id}>
                            {et.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Basis Kerja (Work Basis)</label>
                      <select
                        value={form.work_basis_id}
                        onChange={(e) => setForm((p) => ({ ...p, work_basis_id: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                      >
                        <option value="">-- Pilih Basis --</option>
                        {workBases.map((wb) => (
                          <option key={wb.id} value={wb.id}>
                            {wb.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Jumlah Balita (Childcare)"
                      type="number"
                      min="0"
                      value={form.num_toddlers}
                      onChange={(v) => setForm((p) => ({ ...p, num_toddlers: parseInt(v) || 0 }))}
                    />

                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id="is_trainer"
                        checked={form.is_trainer}
                        onChange={(e) => setForm((p) => ({ ...p, is_trainer: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500/40"
                      />
                      <label htmlFor="is_trainer" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                        Karyawan adalah Trainer
                      </label>
                    </div>

                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        id="is_on_probation"
                        checked={form.is_on_probation}
                        onChange={(e) => setForm((p) => ({ ...p, is_on_probation: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500/40"
                      />
                      <label htmlFor="is_on_probation" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                        Dalam Masa Percobaan Promosi
                      </label>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-200/70" />

                {/* PRIVATE */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Private Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="NIK"
                      value={form.nik}
                      onChange={(v) => setForm((p) => ({ ...p, nik: v }))}
                    />
                    <Input
                      label="NPWP"
                      value={form.npwp}
                      onChange={(v) => setForm((p) => ({ ...p, npwp: v }))}
                    />
                    <Input
                      label="Phone"
                      value={form.phone}
                      full
                      onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                    />
                    <Textarea
                      label="Address"
                      value={form.address}
                      onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                    />
                  </div>
                </section>

                <div className="h-px bg-slate-200/70" />

                {/* BANK */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Bank Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Bank Name"
                      value={form.bank_name}
                      onChange={(v) => setForm((p) => ({ ...p, bank_name: v }))}
                    />
                    <Input
                      label="Account Name"
                      value={form.bank_account_name}
                      onChange={(v) => setForm((p) => ({ ...p, bank_account_name: v }))}
                    />
                    <Input
                      label="Account Number"
                      value={form.bank_account_number}
                      full
                      onChange={(v) => setForm((p) => ({ ...p, bank_account_number: v }))}
                    />
                  </div>
                </section>

                {/* ACTION */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold hover:brightness-110"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => nav(-1)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ===== Small reusable inputs ===== */
function Input({ label, value, onChange, required, full, readOnly, disabled, type = "text", min }) {
  return (
    <div className={full ? "md:col-span-2 space-y-1" : "space-y-1"}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        min={min}
        className={[
          "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40",
          (readOnly || disabled) ? "bg-slate-100 text-slate-600 cursor-not-allowed" : "bg-white",
        ].join(" ")}
        value={value}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <div className="md:col-span-2 space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <textarea
        rows={3}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
