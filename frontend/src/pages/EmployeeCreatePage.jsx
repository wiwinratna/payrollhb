import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function EmployeeCreatePage() {
  const navigate = useNavigate();

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

    // private/sensitive
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

  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError("");
  }

  // Load next code and master lists
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoadingCode(true);
        const nextCodeData = await api("/employees/next-code");
        if (mounted && nextCodeData?.next_employee_code) {
          setForm((p) => ({
            ...p,
            employee_code: nextCodeData.next_employee_code,
            department: p.department || "Finance",
            position: p.position || "Staff",
          }));
        }

        // Fetch master tables
        const [gradesList, empTypesList, workBasesList] = await Promise.all([
          api("/master/grades"),
          api("/master/employment-types"),
          api("/master/work-bases"),
        ]);

        if (mounted) {
          setGrades(Array.isArray(gradesList) ? gradesList : []);
          setEmploymentTypes(Array.isArray(empTypesList) ? empTypesList : []);
          setWorkBases(Array.isArray(workBasesList) ? workBasesList : []);
        }
      } catch (err) {
        console.error("Failed to load master lists:", err);
      } finally {
        if (mounted) setLoadingCode(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  function validate() {
    const e = {};

    if (!form.employee_code.trim()) e.employee_code = "Kode pegawai wajib terisi.";
    if (!form.name.trim()) e.name = "Nama wajib diisi.";
    if (!form.department.trim()) e.department = "Departemen wajib diisi.";
    if (!form.position.trim()) e.position = "Jabatan wajib diisi.";
    if (!["active", "inactive"].includes(form.status)) e.status = "Status tidak valid.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      const payload = {
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
      };

      const data = await api("/employees", {
        method: "POST",
        body: payload,
      });

      const employeeId = data?.employee?.id;
      if (!employeeId) {
        setServerError("Pegawai berhasil dibuat, tapi ID tidak terbaca dari response.");
        return;
      }

      // lanjut ke set salary profile
      navigate(`/employees/${employeeId}/salary-profile/new`);
    } catch (err) {
      if (err?.data?.errors) {
        const mapped = {};
        for (const k of Object.keys(err.data.errors)) {
          mapped[k] = Array.isArray(err.data.errors[k])
            ? err.data.errors[k][0]
            : String(err.data.errors[k]);
        }
        setErrors(mapped);
      } else {
        setServerError(err?.message || "Tidak bisa terhubung ke server. Pastikan backend Laravel berjalan.");
      }
    } finally {
      setLoading(false);
    }
  }

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
              Tambah Pegawai
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Isi data pegawai. Setelah disimpan, kamu akan diarahkan ke halaman profil gaji.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
            onClick={() => navigate("/employees")}
            disabled={loading}
          >
            Kembali
          </Button>
        </div>

        {serverError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}

        {/* Form card */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70">
            <div className="text-sm font-semibold text-slate-900">
              Form Pegawai
            </div>
            <div className="text-xs text-slate-500">
              Lengkapi informasi dasar, data kepegawaian & payroll, data sensitif, dan informasi bank.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* BASIC INFO */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Informasi Dasar
                </h3>
                <span className="text-xs text-slate-500">
                  Field bertanda * wajib diisi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Kode Pegawai *"
                  placeholder={loadingCode ? "Mengambil kode..." : "EMP-0001"}
                  value={form.employee_code}
                  onChange={(v) => setField("employee_code", v.toUpperCase())}
                  error={errors.employee_code}
                  disabled
                />

                <Field
                  label="Nama *"
                  placeholder="Contoh: Pegawai Satu"
                  value={form.name}
                  onChange={(v) => setField("name", v)}
                  error={errors.name}
                />

                <Field
                  label="Departemen *"
                  placeholder="Contoh: Finance"
                  value={form.department}
                  onChange={(v) => setField("department", v)}
                  error={errors.department}
                />

                <Field
                  label="Jabatan *"
                  placeholder="Contoh: Staff"
                  value={form.position}
                  onChange={(v) => setField("position", v)}
                  error={errors.position}
                />

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-200/70" />

            {/* KEPEGAWAIAN & PAYROLL */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Informasi Kepegawaian & Payroll (Fase 1)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Grade / Jabatan Level</label>
                  <select
                    value={form.grade_id}
                    onChange={(e) => setField("grade_id", e.target.value)}
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
                    onChange={(e) => setField("employment_type_id", e.target.value)}
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
                    onChange={(e) => setField("work_basis_id", e.target.value)}
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

                <Field
                  label="Jumlah Balita (Childcare)"
                  type="number"
                  min="0"
                  value={form.num_toddlers}
                  onChange={(v) => setField("num_toddlers", parseInt(v) || 0)}
                  error={errors.num_toddlers}
                />

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="is_trainer"
                    checked={form.is_trainer}
                    onChange={(e) => setField("is_trainer", e.target.checked)}
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
                    onChange={(e) => setField("is_on_probation", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-200 text-sky-600 focus:ring-sky-500/40"
                  />
                  <label htmlFor="is_on_probation" className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                    Dalam Masa Percobaan Promosi
                  </label>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-200/70" />

            {/* PRIVATE / SENSITIVE INFO */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Data Pribadi / Sensitif
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="NIK"
                  placeholder="Contoh: 3273xxxxxxxxxxxx"
                  value={form.nik}
                  onChange={(v) => setField("nik", v)}
                  error={errors.nik}
                />

                <Field
                  label="NPWP"
                  placeholder="Contoh: xx.xxx.xxx.x-xxx.xxx"
                  value={form.npwp}
                  onChange={(v) => setField("npwp", v)}
                  error={errors.npwp}
                />

                <Field
                  label="No. Telepon"
                  placeholder="Contoh: 08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(v) => setField("phone", v)}
                  error={errors.phone}
                />

                <Textarea
                  label="Alamat"
                  placeholder="Alamat lengkap..."
                  value={form.address}
                  onChange={(v) => setField("address", v)}
                  error={errors.address}
                />
              </div>
            </section>

            <div className="h-px bg-slate-200/70" />

            {/* BANK */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Informasi Bank
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Nama Bank"
                  placeholder="Contoh: BCA / BRI / Mandiri"
                  value={form.bank_name}
                  onChange={(v) => setField("bank_name", v)}
                  error={errors.bank_name}
                />

                <Field
                  label="Nama Pemilik Rekening"
                  placeholder="Contoh: Nama pemilik rekening"
                  value={form.bank_account_name}
                  onChange={(v) => setField("bank_account_name", v)}
                  error={errors.bank_account_name}
                />

                <Field
                  label="Nomor Rekening"
                  placeholder="Contoh: 1234567890"
                  value={form.bank_account_number}
                  onChange={(v) => setField("bank_account_number", v)}
                  error={errors.bank_account_number}
                />
              </div>
            </section>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading || loadingCode}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                {loading ? "Menyimpan..." : "Simpan Pegawai"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/employees")}
                disabled={loading}
                className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
              >
                Batal
              </Button>
            </div>
          </form>

          <div className="px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Human Plus Institute</span>
            <span>Payroll Internal System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small reusable inputs ---------- */
function Field({ label, value, onChange, placeholder, error, disabled, type = "text", min }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        min={min}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition",
          disabled ? "bg-slate-50 text-slate-700 cursor-not-allowed" : "bg-white text-slate-900",
          "border-slate-200",
          "focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40",
          error ? "border-rose-300" : "",
        ].join(" ")}
      />
      {error && <div className="text-xs text-rose-700">{error}</div>}
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, error }) {
  return (
    <div className="md:col-span-2 space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition min-h-[90px]",
          "border-slate-200 bg-white text-slate-900",
          "focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40",
          error ? "border-rose-300" : "",
        ].join(" ")}
      />
      {error && <div className="text-xs text-rose-700">{error}</div>}
    </div>
  );
}
