<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;
use App\Services\CryptoService;

class EmployeeController extends Controller
{
    private function roleOf($user): string
    {
        return strtolower((string) ($user->role ?? ''));
    }

    private function forbid(string $msg = 'Forbidden')
    {
        return response()->json(['message' => $msg], 403);
    }

    private function inRoles($user, array $roles): bool
    {
        $r = $this->roleOf($user);
        $roles = array_map(fn ($x) => strtolower((string) $x), $roles);
        return in_array($r, $roles, true);
    }

    public function index(Request $request)
    {
        $user = $request->user();

        // HCGA/FAT/DIRECTOR boleh lihat list
        if (!$this->inRoles($user, ['hcga', 'fat', 'director'])) {
            return $this->forbid();
        }

        $qStatus = $request->query('status'); // active/inactive/null
        $query = Employee::query()->orderBy('name');

        if ($qStatus) {
            $query->where('status', $qStatus);
        }

        return $query->get([
            'id',
            'employee_code',
            'name',
            'department',
            'position',
            'status',
            'user_id',
        ]);
    }

    public function nextCode(Request $request)
    {
        $user = $request->user();

        // hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        $last = Employee::whereNotNull('employee_code')
            ->where('employee_code', 'like', 'EMP-%')
            ->orderByDesc('id')
            ->value('employee_code');

        $nextNumber = 1;
        if ($last && preg_match('/EMP-(\d{1,})$/', $last, $m)) {
            $nextNumber = ((int) $m[1]) + 1;
        }

        $nextCode = 'EMP-' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);

        return response()->json([
            'next_employee_code' => $nextCode,
        ]);
    }

    public function show(Request $request, Employee $employee)
    {
        $user = $request->user();
        $role = $this->roleOf($user);

        $isOwner = $employee->user_id && (int) $employee->user_id === (int) $user->id;

        // akses dasar:
        // - HCGA/FAT/DIRECTOR boleh lihat employee mana pun
        // - STAFF hanya boleh lihat dirinya sendiri
        if (!in_array($role, ['hcga', 'fat', 'director'], true)) {
            if (!($role === 'staff' && $isOwner)) {
                return $this->forbid();
            }
        }

        // field base (aman)
        $base = [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => $employee->name,
            'department' => $employee->department,
            'position' => $employee->position,
            'status' => $employee->status,
            'user_id' => $employee->user_id,
        ];

        $alg = strtoupper((string) ($employee->pii_alg ?? 'AES'));

        // aturan lihat PII vs Bank
        $canSeePII  = ($role === 'hcga') || $isOwner; // NIK/NPWP/Phone/Address
        $canSeeBank = in_array($role, ['hcga', 'fat'], true) || $isOwner; // bank utk transfer

        if ($canSeePII) {
            $base += [
                'nik' => CryptoService::readEncryptedOrPlain($employee->nik_enc, $employee->nik, $alg),
                'npwp' => CryptoService::readEncryptedOrPlain($employee->npwp_enc, $employee->npwp, $alg),
                'phone' => CryptoService::readEncryptedOrPlain($employee->phone_enc, $employee->phone, $alg),
                'address' => CryptoService::readEncryptedOrPlain($employee->address_enc, $employee->address, $alg),
            ];
        }

        if ($canSeeBank) {
            $base += [
                'bank_name' => $employee->bank_name,
                'bank_account_name' => $employee->bank_account_name,
                'bank_account_number' => CryptoService::readEncryptedOrPlain(
                    $employee->bank_account_number_enc,
                    $employee->bank_account_number,
                    $alg
                ),
            ];
        }

        // ====== tambahin ACCOUNT INFO (emp.user) ======
        // Aturan aman:
        // - HCGA: boleh lihat user detail (id,name,email,role)
        // - OWNER: boleh lihat user detail miliknya sendiri
        // - FAT/DIRECTOR: tidak perlu email, jadi tidak dikirim
        if ($employee->user_id && ($role === 'hcga' || $isOwner)) {
            $u = User::query()
                ->select(['id', 'name', 'email', 'role'])
                ->find($employee->user_id);

            $base['user'] = $u ? [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
            ] : null;
        } else {
            // biar frontend bisa tahu "punya akun atau tidak" tanpa bocorin email
            $base['user'] = $employee->user_id ? [
                'id' => (int) $employee->user_id,
            ] : null;
        }

        // masked kalau sama sekali gak dapat info sensitif
        if (!$canSeePII && !$canSeeBank) {
            $base['masked'] = true;
        }

        return response()->json($base);
    }

    public function createUser(Request $request, Employee $employee)
    {
        $actor = $request->user();

        // hanya HCGA bikin akun
        if (!$this->inRoles($actor, ['hcga'])) {
            return $this->forbid();
        }

        if ($employee->user_id) {
            return response()->json(['message' => 'Employee ini sudah punya akun.'], 422);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in(['staff', 'hcga'])],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
        ]);

        $employee->update(['user_id' => $user->id]);

        return response()->json([
            'message' => 'Akun berhasil dibuat.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 201);
    }

    public function salaryProfile(Request $request, Employee $employee)
    {
        $user = $request->user();
        $role = $this->roleOf($user);

        // lihat salary profile: HCGA/FAT/DIRECTOR
        if (!in_array($role, ['hcga', 'fat', 'director'], true)) {
            return $this->forbid();
        }

        $date = $request->query('date', now()->toDateString());
        $profile = $employee->currentSalaryProfile($date);

        if (!$profile) {
            return response()->json(['message' => 'Salary profile not found'], 404);
        }

        $alg = strtoupper((string) ($profile->salary_alg ?? 'AES'));

        $base  = $profile->base_salary_enc ? (float) CryptoService::decryptByAlg($profile->base_salary_enc, $alg) : (float) $profile->base_salary;
        $allow = $profile->allowance_fixed_enc ? (float) CryptoService::decryptByAlg($profile->allowance_fixed_enc, $alg) : (float) $profile->allowance_fixed;
        $ded   = $profile->deduction_fixed_enc ? (float) CryptoService::decryptByAlg($profile->deduction_fixed_enc, $alg) : (float) $profile->deduction_fixed;

        return response()->json([
            'employee_id' => $employee->id,
            'effective_from' => $profile->effective_from->toDateString(),
            'base_salary' => (string) $base,
            'allowance_fixed' => (string) $allow,
            'deduction_fixed' => (string) $ded,
            'suggested_total' => (string) ($base + $allow - $ded),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        // create employee: hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        $data = $request->validate([
            'employee_code' => ['required', 'string', 'max:50', 'unique:employees,employee_code'],
            'name' => ['required', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],

            'nik' => ['nullable', 'string', 'max:32'],
            'npwp' => ['nullable', 'string', 'max:32'],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],

            'bank_name' => ['nullable', 'string', 'max:100'],
            'bank_account_name' => ['nullable', 'string', 'max:100'],
            'bank_account_number' => ['nullable', 'string', 'max:50'],

            'pii_alg' => ['nullable', 'in:AES,RSA'],
        ]);

        $data['user_id'] = null;

        $piiAlg = strtoupper((string) ($data['pii_alg'] ?? 'AES'));

        $encPII = function (string $v) use ($piiAlg) {
            return $piiAlg === 'RSA'
                ? CryptoService::encryptRSA($v)
                : CryptoService::encryptAESGCM($v);
        };

        $data['nik_enc'] = !empty($data['nik']) ? $encPII((string) $data['nik']) : null;
        $data['npwp_enc'] = !empty($data['npwp']) ? $encPII((string) $data['npwp']) : null;
        $data['phone_enc'] = !empty($data['phone']) ? $encPII((string) $data['phone']) : null;
        $data['address_enc'] = !empty($data['address']) ? $encPII((string) $data['address']) : null;
        $data['bank_account_number_enc'] = !empty($data['bank_account_number']) ? $encPII((string) $data['bank_account_number']) : null;

        $data['pii_alg'] = $piiAlg;
        $data['pii_key_id'] = CryptoService::keyId();

        $employee = Employee::create($data);

        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'name' => $employee->name,
                'department' => $employee->department,
                'position' => $employee->position,
                'status' => $employee->status,
                'user_id' => $employee->user_id,
            ],
        ], 201);
    }

    public function storeSalaryProfile(Request $request, Employee $employee)
    {
        $user = $request->user();

        // SET SALARY: hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        $data = $request->validate([
            'base_salary' => ['required', 'numeric', 'min:0'],
            'allowance_fixed' => ['nullable', 'numeric', 'min:0'],
            'deduction_fixed' => ['nullable', 'numeric', 'min:0'],
            'effective_from' => ['required', 'date'],

            'daily_rate' => ['nullable', 'numeric', 'min:0'],
            'overtime_rate_per_hour' => ['nullable', 'numeric', 'min:0'],
            'late_penalty_per_minute' => ['nullable', 'numeric', 'min:0'],

            'salary_alg' => ['nullable', 'in:AES,RSA'],
        ]);

        $alg = strtoupper((string) ($data['salary_alg'] ?? 'AES'));

        $enc = function (string $v) use ($alg) {
            return $alg === 'RSA'
                ? CryptoService::encryptRSA($v)
                : CryptoService::encryptAESGCM($v);
        };

        $base  = (float) $data['base_salary'];
        $allow = (float) ($data['allowance_fixed'] ?? 0);
        $ded   = (float) ($data['deduction_fixed'] ?? 0);

        $daily = array_key_exists('daily_rate', $data) ? (float) ($data['daily_rate'] ?? 0) : null;
        $ot    = array_key_exists('overtime_rate_per_hour', $data) ? (float) ($data['overtime_rate_per_hour'] ?? 0) : null;
        $late  = array_key_exists('late_penalty_per_minute', $data) ? (float) ($data['late_penalty_per_minute'] ?? 0) : null;

        $profile = $employee->salaryProfiles()->create([
            'base_salary' => $base,
            'allowance_fixed' => $allow,
            'deduction_fixed' => $ded,
            'daily_rate' => $daily,
            'overtime_rate_per_hour' => $ot,
            'late_penalty_per_minute' => $late,
            'effective_from' => $data['effective_from'],

            'base_salary_enc' => $enc((string) $base),
            'allowance_fixed_enc' => $enc((string) $allow),
            'deduction_fixed_enc' => $enc((string) $ded),
            'daily_rate_enc' => $daily !== null ? $enc((string) $daily) : null,
            'overtime_rate_per_hour_enc' => $ot !== null ? $enc((string) $ot) : null,
            'late_penalty_per_minute_enc' => $late !== null ? $enc((string) $late) : null,

            'salary_alg' => $alg,
            'salary_key_id' => CryptoService::keyId(),
        ]);

        return response()->json([
            'salary_profile' => $profile,
        ], 201);
    }

    public function update(Request $request, Employee $employee)
    {
        $user = $request->user();

        // update employee: hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        // NOTE: employee_code sengaja TIDAK BOLEH diupdate (read-only)
        $data = $request->validate([
            'employee_code' => ['sometimes'], // <- diterima biar validator gak error kalau kekirim, tapi nanti kita buang
            'name' => ['sometimes', 'string', 'max:255'],
            'department' => ['sometimes', 'nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],

            'nik' => ['sometimes', 'nullable', 'string', 'max:32'],
            'npwp' => ['sometimes', 'nullable', 'string', 'max:32'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],

            'bank_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'bank_account_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:50'],

            'pii_alg' => ['sometimes', 'in:AES,RSA'],
        ]);

        // ✅ HARD BLOCK: jangan pernah update employee_code
        unset($data['employee_code']);

        $piiAlg = strtoupper((string) ($data['pii_alg'] ?? ($employee->pii_alg ?? 'AES')));

        $encPII = function (string $v) use ($piiAlg) {
            return $piiAlg === 'RSA'
                ? CryptoService::encryptRSA($v)
                : CryptoService::encryptAESGCM($v);
        };

        if (array_key_exists('nik', $data)) {
            $data['nik_enc'] = !empty($data['nik']) ? $encPII((string) $data['nik']) : null;
        }
        if (array_key_exists('npwp', $data)) {
            $data['npwp_enc'] = !empty($data['npwp']) ? $encPII((string) $data['npwp']) : null;
        }
        if (array_key_exists('phone', $data)) {
            $data['phone_enc'] = !empty($data['phone']) ? $encPII((string) $data['phone']) : null;
        }
        if (array_key_exists('address', $data)) {
            $data['address_enc'] = !empty($data['address']) ? $encPII((string) $data['address']) : null;
        }
        if (array_key_exists('bank_account_number', $data)) {
            $data['bank_account_number_enc'] = !empty($data['bank_account_number'])
                ? $encPII((string) $data['bank_account_number'])
                : null;
        }

        $data['pii_alg'] = $piiAlg;
        $data['pii_key_id'] = CryptoService::keyId();

        $employee->update($data);

        // sinkron nama user kalau employee punya akun
        if (array_key_exists('name', $data) && $employee->user_id) {
            User::where('id', $employee->user_id)->update([
                'name' => $data['name'],
            ]);
        }

        return response()->json([
            'message' => 'Employee updated',
            'employee' => $employee->fresh(),
        ]);
    }

    public function destroy(Request $request, Employee $employee)
    {
        $user = $request->user();

        // delete employee: hanya HCGA
        if (!$this->inRoles($user, ['hcga'])) {
            return $this->forbid();
        }

        if ($employee->payrolls()->exists()) {
            return response()->json([
                'message' => 'Employee tidak bisa dihapus karena sudah memiliki payroll.'
            ], 422);
        }

        $employee->salaryProfiles()->delete();
        $employee->delete();

        return response()->json(['message' => 'Employee deleted']);
    }
}
