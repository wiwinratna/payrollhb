<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\MonthlyMandaysSummary;
use App\Models\Payroll;
use App\Models\PayrollAllowance;
use App\Models\AllowanceType;
use App\Models\GradeAllowanceRate;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayrollCalculationService
{
    const ENGINE_VERSION = 'v1.0';

    public function validatePrerequisites($employee, $periodMonth, $ignorePayrollId = null)
    {
        if ($employee->status !== 'active') return ['status' => false, 'error' => 'Employee tidak aktif.'];
        if (!$employee->grade_id) return ['status' => false, 'error' => 'Grade ID kosong.'];
        if (!$employee->employment_type_id) return ['status' => false, 'error' => 'Employment Type kosong.'];

        [$start, $end] = MandaysRecalculationService::getPeriodDates($periodMonth);
        $profile = $employee->currentSalaryProfile($start->toDateString());
        
        if (!$profile) return ['status' => false, 'error' => 'Salary profile aktif tidak ditemukan.'];
        
        $activeGradeId = $profile->grade_id ?? $employee->grade_id;
        $grade = $activeGradeId ? \App\Models\Grade::find($activeGradeId) : null;

        // Profile decrypt and fallback
        $salaryDecrypted = CryptoService::decryptAESGCM($profile->base_salary_enc);
        if ($salaryDecrypted === null || $salaryDecrypted === '') {
            if ($profile->base_salary > 0) {
                $salaryDecrypted = (string)$profile->base_salary;
            } else {
                $salaryDecrypted = $grade ? (string)$grade->default_base_salary : '0';
            }
        }

        $mandaysDecrypted = $profile->mandays_rate_enc ? CryptoService::decryptAESGCM($profile->mandays_rate_enc) : null;
        if ($mandaysDecrypted === null || $mandaysDecrypted === '') {
            if ($profile->mandays_rate > 0) {
                $mandaysDecrypted = (string)$profile->mandays_rate;
            } else {
                $mandaysDecrypted = $grade ? (string)$grade->default_mandays_rate : '0';
            }
        }
        
        if ($mandaysDecrypted === null || $mandaysDecrypted === '') {
            return ['status' => false, 'error' => 'Mandays rate kosong.'];
        }

        $summary = $employee->monthlyMandaysSummaries()->where('period_month', $periodMonth)->first();
        if (!$summary) return ['status' => false, 'error' => 'Monthly Mandays Summary tidak ada.'];
        if (!$summary->is_finalized) return ['status' => false, 'error' => 'Summary belum finalized.'];

        $periodeDate = Carbon::createFromFormat('Y-m', $periodMonth)->startOfMonth()->toDateString();
        $existingQ = Payroll::where('employee_id', $employee->id)->where('periode', $periodeDate);
        if ($ignorePayrollId) {
            $existingQ->where('id', '!=', $ignorePayrollId);
        }
        $existing = $existingQ->first();
        if ($existing) return ['status' => false, 'error' => 'Payroll sudah ada di periode ini.'];

        return [
            'status' => true,
            'profile' => [
                'base_salary' => $salaryDecrypted,
                'mandays_rate' => $mandaysDecrypted,
                'grade_id' => $activeGradeId
            ],
            'summary' => $summary,
            'periodFrom' => $start->toDateString(),
            'periodTo' => $end->toDateString(),
            'periode' => $periodeDate
        ];
    }

    public function runEngine($employee, $periodMonth, $ignorePayrollId = null)
    {
        $prereq = $this->validatePrerequisites($employee, $periodMonth, $ignorePayrollId);
        if (!$prereq['status']) {
            return [
                'is_calculable' => false,
                'prerequisite_status' => false,
                'blocking_warnings' => [$prereq['error']],
                'non_blocking_warnings' => []
            ];
        }

        $summary = $prereq['summary'];
        $profile = $prereq['profile'];
        
        $blocking_warnings = [];
        $non_blocking_warnings = [];
        
        // 1. Mismatch guard
        $assignmentMandays = $employee->projectAssignments()->where('period_month', $periodMonth)->sum('mandays');
        if (round((float)$assignmentMandays, 2) !== round((float)$summary->mandays_project, 2)) {
            $blocking_warnings[] = 'Mandays project tidak sinkron dengan total assignment (' . $assignmentMandays . ' vs ' . $summary->mandays_project . ')';
        }

        $gaji_pokok = 0;
        $isProject = $employee->employmentType->code === 'project';
        $isFixRate = $employee->employmentType->code === 'fix_rate';
        
        $mandaysRate = (float)$profile['mandays_rate'];
        $baseSalary = (float)$profile['base_salary'];
        $activeGradeId = $profile['grade_id'];

        // Gaji Pokok = Gaji Bulanan Tetap + (Gaji Harian * Kehadiran)
        $gaji_pokok = $baseSalary + ($mandaysRate * $summary->total_mandays);

        $allowances = [];
        $total_allowances = 0;

        $getRate = function($typeCode) use ($employee, $activeGradeId) {
            $type = AllowanceType::where('code', $typeCode)->first();
            if (!$type) return null;
            $rate = GradeAllowanceRate::where('grade_id', $activeGradeId)
                ->where('allowance_type_id', $type->id)
                ->first();
            return [
                'type_id' => $type->id,
                'type_code' => $type->code,
                'type_name' => $type->name,
                'rate' => $rate ? (float)$rate->rate_amount : null
            ];
        };

        // 3. Transport trip
        $trTrip = $getRate('transport_trip');
        if ($trTrip && $trTrip['rate'] !== null) {
            $amt = $trTrip['rate'] * $summary->num_trips;
            $allowances[] = [
                'allowance_type_id' => $trTrip['type_id'],
                'allowance_type' => $trTrip['type_code'],
                'amount' => $amt,
                'rate_amount' => $trTrip['rate'],
                'mandays' => null,
                'calculation_detail' => ['num_trips' => $summary->num_trips]
            ];
        }

        // 4. Meal
        $trMeal = $getRate('meal');
        if ($trMeal && $trMeal['rate'] !== null) {
            $assignments = $employee->projectAssignments()->where('period_month', $periodMonth)
                ->whereHas('project', function($q) {
                    $q->where('is_client_provide_meal', false);
                })->get();
            $mealMandays = $assignments->sum('mandays');
            if ($mealMandays == 0) {
                $non_blocking_warnings[] = 'Mandays assignment untuk meal allowance bernilai 0.';
            }
            $amt = $trMeal['rate'] * $mealMandays;
            $allowances[] = [
                'allowance_type_id' => $trMeal['type_id'],
                'allowance_type' => $trMeal['type_code'],
                'amount' => $amt,
                'rate_amount' => $trMeal['rate'],
                'mandays' => $mealMandays,
                'calculation_detail' => ['project_assignments_mandays' => $mealMandays]
            ];
        }

        // 5. Position
        $trPos = $getRate('position');
        if ($trPos) {
            if ($trPos['rate'] === null) {
                $non_blocking_warnings[] = 'Position allowance rate kosong di grade.';
            } else {
                $amt = $trPos['rate'];
                if ($employee->is_on_probation) {
                    $amt = $amt * 0.5;
                }
                $allowances[] = [
                    'allowance_type_id' => $trPos['type_id'],
                    'allowance_type' => $trPos['type_code'],
                    'amount' => $amt,
                    'rate_amount' => $trPos['rate'],
                    'mandays' => null,
                    'calculation_detail' => ['is_on_probation' => $employee->is_on_probation]
                ];
            }
        }

        // 6. Childcare
        if ($employee->num_toddlers >= 3 && $isProject) {
            $trChild = $getRate('childcare');
            if ($trChild) {
                if ($trChild['rate'] === null) {
                    $non_blocking_warnings[] = 'Childcare allowance rate kosong padahal num_toddlers >= 3.';
                } else {
                    $amt = $trChild['rate'];
                    $allowances[] = [
                        'allowance_type_id' => $trChild['type_id'],
                        'allowance_type' => $trChild['type_code'],
                        'amount' => $amt,
                        'rate_amount' => $trChild['rate'],
                        'mandays' => null,
                        'calculation_detail' => ['num_toddlers' => $employee->num_toddlers]
                    ];
                }
            }
        }

        // 7. Training
        if ($employee->is_trainer && $summary->mandays_training > 0) {
            if (empty($mandaysRate)) {
                $blocking_warnings[] = 'Mandays rate kosong, dibutuhkan untuk hitung allowance training.';
            } else {
                $trTrain = AllowanceType::where('code', 'training')->first();
                $amt = $mandaysRate * 1.5 * $summary->mandays_training;
                $allowances[] = [
                    'allowance_type_id' => $trTrain->id,
                    'allowance_type' => $trTrain->code,
                    'amount' => $amt,
                    'rate_amount' => null,
                    'mandays' => $summary->mandays_training,
                    'calculation_detail' => ['multiplier' => 1.5, 'mandays_rate' => $mandaysRate]
                ];
            }
        }

        // 8. Business Trip
        if ($isFixRate) {
            $trBTrip = $getRate('business_trip');
            if ($trBTrip && $trBTrip['rate'] !== null) {
                $amt = $trBTrip['rate'] * $summary->mandays_outside_city;
                $allowances[] = [
                    'allowance_type_id' => $trBTrip['type_id'],
                    'allowance_type' => $trBTrip['type_code'],
                    'amount' => $amt,
                    'rate_amount' => $trBTrip['rate'],
                    'mandays' => $summary->mandays_outside_city,
                    'calculation_detail' => ['mandays_outside_city' => $summary->mandays_outside_city]
                ];
            }

            // 9. HO Transport Meal
            $trHO = $getRate('ho_transport_meal');
            if ($trHO && $trHO['rate'] !== null) {
                // Biasanya transport & makan HO hanya untuk WFO
                $mdHO = $summary->mandays_ho_wfo;
                $amt = $trHO['rate'] * $mdHO;
                $allowances[] = [
                    'allowance_type_id' => $trHO['type_id'],
                    'allowance_type' => $trHO['type_code'],
                    'amount' => $amt,
                    'rate_amount' => $trHO['rate'],
                    'mandays' => $mdHO,
                    'calculation_detail' => ['mandays_ho_wfo' => $summary->mandays_ho_wfo]
                ];
            }
        }

        // 10. Transport Insurance
        $trIns = $getRate('transport_insurance');
        if ($trIns && $trIns['rate'] !== null) {
            $amt = $trIns['rate'] * $summary->mandays_project;
            $allowances[] = [
                'allowance_type_id' => $trIns['type_id'],
                'allowance_type' => $trIns['type_code'],
                'amount' => $amt,
                'rate_amount' => $trIns['rate'],
                'mandays' => $summary->mandays_project,
                'calculation_detail' => ['mandays_project' => $summary->mandays_project]
            ];
        }

        foreach ($allowances as $al) {
            $total_allowances += $al['amount'];
        }

        $total_deductions = 0;
        $total_nett = $gaji_pokok + $total_allowances - $total_deductions;

        return [
            'is_calculable' => count($blocking_warnings) === 0,
            'prerequisite_status' => true,
            'blocking_warnings' => $blocking_warnings,
            'non_blocking_warnings' => $non_blocking_warnings,
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'period_month' => $periodMonth,
            'period_from' => $prereq['periodFrom'],
            'period_to' => $prereq['periodTo'],
            'periode' => $prereq['periode'],
            'gaji_pokok' => $gaji_pokok,
            'allowances' => $allowances,
            'total_allowances' => $total_allowances,
            'total_deductions' => $total_deductions,
            'total_nett' => $total_nett,
            'calculation_mode' => 'auto',
            'engine_version' => self::ENGINE_VERSION,
            'message' => 'PPh 21 dan BPJS belum dihitung (Masuk Phase 5).'
        ];
    }

    public function calculatePreview($employeeId, $periodMonth)
    {
        $employee = Employee::with(['employmentType', 'workBasis', 'projectAssignments.project'])->find($employeeId);
        if (!$employee) return ['is_calculable' => false, 'prerequisite_status' => false, 'blocking_warnings' => ['Employee not found']];
        return $this->runEngine($employee, $periodMonth);
    }

    public function calculateAndSave($employeeId, $periodMonth, $recordedBy)
    {
        $employee = Employee::with(['employmentType', 'workBasis', 'projectAssignments.project'])->find($employeeId);
        if (!$employee) throw new \Exception("Employee not found");
        
        $res = $this->runEngine($employee, $periodMonth);
        if (!$res['is_calculable']) {
            throw new \Exception("Cannot calculate: " . implode(', ', $res['blocking_warnings']));
        }

        DB::beginTransaction();
        try {
            // Generate encryption string formats
            $gpEnc = CryptoService::encryptAESGCM((string)round($res['gaji_pokok']));
            $alEnc = CryptoService::encryptAESGCM((string)round($res['total_allowances']));
            $dedEnc = CryptoService::encryptAESGCM((string)round($res['total_deductions']));
            $totEnc = CryptoService::encryptAESGCM((string)round($res['total_nett']));

            $payroll = Payroll::create([
                'user_id' => $recordedBy,
                'employee_id' => $employee->id,
                'periode' => $res['periode'],
                'period_from' => $res['period_from'],
                'period_to' => $res['period_to'],
                'status' => 'draft',
                'gaji_pokok' => $res['gaji_pokok'],
                'tunjangan' => $res['total_allowances'],
                'potongan' => $res['total_deductions'],
                'total' => $res['total_nett'],
                'gaji_pokok_enc' => $gpEnc,
                'tunjangan_enc' => $alEnc,
                'potongan_enc' => $dedEnc,
                'total_enc' => $totEnc,
                'total_allowances' => $res['total_allowances'],
                'total_deductions' => $res['total_deductions'],
                'total_allowances_enc' => $alEnc,
                'total_deductions_enc' => $dedEnc,
                'calculation_mode' => 'auto',
                'engine_version' => $res['engine_version'],
                'salary_alg' => 'AES'
            ]);

            foreach ($res['allowances'] as $al) {
                PayrollAllowance::create([
                    'payroll_id' => $payroll->id,
                    'allowance_type_id' => $al['allowance_type_id'],
                    'rate_amount' => $al['rate_amount'],
                    'mandays' => $al['mandays'],
                    'amount' => $al['amount'],
                    'amount_enc' => CryptoService::encryptAESGCM((string)round($al['amount'])),
                    'calculation_detail' => json_encode($al['calculation_detail']),
                    'salary_alg' => 'AES'
                ]);
            }

            AuditLog::create([
                'user_id' => $recordedBy,
                'action' => 'PAYROLL_AUTO_CALCULATE',
                'payroll_id' => $payroll->id,
                'meta' => ['employee_id' => $employee->id, 'period_month' => $periodMonth, 'warnings' => $res['non_blocking_warnings']],
                'ip_address' => request()->ip()
            ]);

            DB::commit();
            return $payroll;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function batchGenerate($periodMonth, $recordedBy)
    {
        $employees = Employee::where('status', 'active')->get();
        $results = [];
        $success = 0;
        $failed = 0;

        foreach ($employees as $employee) {
            DB::beginTransaction();
            try {
                $prereq = $this->validatePrerequisites($employee, $periodMonth);
                if (!$prereq['status']) {
                    throw new \Exception($prereq['error']);
                }
                
                $res = $this->runEngine($employee, $periodMonth);
                if (!$res['is_calculable']) {
                    throw new \Exception(implode(', ', $res['blocking_warnings']));
                }

                $gpEnc = CryptoService::encryptAESGCM((string)round($res['gaji_pokok']));
                $alEnc = CryptoService::encryptAESGCM((string)round($res['total_allowances']));
                $dedEnc = CryptoService::encryptAESGCM((string)round($res['total_deductions']));
                $totEnc = CryptoService::encryptAESGCM((string)round($res['total_nett']));

                $payroll = Payroll::create([
                    'user_id' => $recordedBy,
                    'employee_id' => $employee->id,
                    'periode' => $res['periode'],
                    'period_from' => $res['period_from'],
                    'period_to' => $res['period_to'],
                    'status' => 'draft',
                    'gaji_pokok' => $res['gaji_pokok'],
                    'tunjangan' => $res['total_allowances'],
                    'potongan' => $res['total_deductions'],
                    'total' => $res['total_nett'],
                    'gaji_pokok_enc' => $gpEnc,
                    'tunjangan_enc' => $alEnc,
                    'potongan_enc' => $dedEnc,
                    'total_enc' => $totEnc,
                    'total_allowances' => $res['total_allowances'],
                    'total_deductions' => $res['total_deductions'],
                    'total_allowances_enc' => $alEnc,
                    'total_deductions_enc' => $dedEnc,
                    'calculation_mode' => 'auto',
                    'engine_version' => $res['engine_version'],
                    'salary_alg' => 'AES'
                ]);

                foreach ($res['allowances'] as $al) {
                    PayrollAllowance::create([
                        'payroll_id' => $payroll->id,
                        'allowance_type_id' => $al['allowance_type_id'],
                        'rate_amount' => $al['rate_amount'],
                        'mandays' => $al['mandays'],
                        'amount' => $al['amount'],
                        'amount_enc' => CryptoService::encryptAESGCM((string)round($al['amount'])),
                        'calculation_detail' => json_encode($al['calculation_detail']),
                        'salary_alg' => 'AES'
                    ]);
                }
                
                DB::commit();
                $success++;
                $results[] = ['employee_id' => $employee->id, 'status' => 'success', 'payroll_id' => $payroll->id];
            } catch (\Exception $e) {
                DB::rollBack();
                $failed++;
                $results[] = ['employee_id' => $employee->id, 'status' => 'failed', 'errors' => [$e->getMessage()]];
            }
        }

        AuditLog::create([
            'user_id' => $recordedBy,
            'action' => 'PAYROLL_BATCH_GENERATE',
            'payroll_id' => null,
            'meta' => ['period_month' => $periodMonth, 'total_employees' => count($employees), 'success' => $success, 'failed' => $failed],
            'ip_address' => request()->ip()
        ]);

        return [
            'period_month' => $periodMonth,
            'total_employees' => count($employees),
            'success_count' => $success,
            'failed_count' => $failed,
            'results' => $results
        ];
    }

    public function recalculate(Payroll $payroll, $force, $recordedBy)
    {
        if ($payroll->status !== 'draft') throw new \Exception("Hanya payroll draft yang bisa direcalculate.");
        if ($payroll->calculation_mode !== 'auto') throw new \Exception("Hanya auto payroll yang bisa direcalculate.");

        $hasOverride = $payroll->allowances()->where('is_manual_override', true)->exists();
        if ($hasOverride && !$force) {
            throw new \Exception("Terdapat manual override allowance. Recalculate ditolak tanpa force.");
        }

        $employee = $payroll->employee;
        $pm = Carbon::parse($payroll->period_from)->format('Y-m');
        if (Carbon::parse($payroll->period_from)->day < 28) {
            // meaning it was standard month, maybe handle edge case, 
            // wait: 2026-05-28 -> 2026-06. Carbon::parse(2026-05-28)->day >= 28.
            $pm = Carbon::parse($payroll->period_from)->addMonth()->format('Y-m');
        } else {
            $pm = Carbon::parse($payroll->period_from)->addMonth()->format('Y-m'); // 28th May -> Jun
        }
        
        $res = $this->runEngine($employee, $pm, $payroll->id);
        if (!$res['is_calculable']) throw new \Exception("Cannot recalculate: " . implode(', ', $res['blocking_warnings']));

        DB::beginTransaction();
        try {
            $payroll->allowances()->delete();
            $gpEnc = CryptoService::encryptAESGCM((string)round($res['gaji_pokok']));
            $alEnc = CryptoService::encryptAESGCM((string)round($res['total_allowances']));
            $dedEnc = CryptoService::encryptAESGCM((string)round($res['total_deductions']));
            $totEnc = CryptoService::encryptAESGCM((string)round($res['total_nett']));

            $payroll->update([
                'gaji_pokok' => $res['gaji_pokok'],
                'tunjangan' => $res['total_allowances'],
                'potongan' => $res['total_deductions'],
                'total' => $res['total_nett'],
                'gaji_pokok_enc' => $gpEnc,
                'tunjangan_enc' => $alEnc,
                'potongan_enc' => $dedEnc,
                'total_enc' => $totEnc,
                'total_allowances' => $res['total_allowances'],
                'total_deductions' => $res['total_deductions'],
                'total_allowances_enc' => $alEnc,
                'total_deductions_enc' => $dedEnc,
            ]);

            foreach ($res['allowances'] as $al) {
                PayrollAllowance::create([
                    'payroll_id' => $payroll->id,
                    'allowance_type_id' => $al['allowance_type_id'],
                    'rate_amount' => $al['rate_amount'],
                    'mandays' => $al['mandays'],
                    'amount' => $al['amount'],
                    'amount_enc' => CryptoService::encryptAESGCM((string)round($al['amount'])),
                    'calculation_detail' => json_encode($al['calculation_detail']),
                    'salary_alg' => 'AES'
                ]);
            }

            AuditLog::create([
                'user_id' => $recordedBy,
                'action' => 'PAYROLL_RECALCULATE',
                'payroll_id' => $payroll->id,
                'meta' => ['force' => $force, 'has_override_overwritten' => $hasOverride],
                'ip_address' => request()->ip()
            ]);

            DB::commit();
            return $payroll;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function overrideAllowance(Payroll $payroll, PayrollAllowance $allowance, $amount, $reason, $recordedBy)
    {
        if ($payroll->status !== 'draft') throw new \Exception("Hanya draft payroll yang dapat di override.");
        if ($payroll->calculation_mode !== 'auto') throw new \Exception("Hanya auto payroll yang dapat di override.");
        if ($allowance->payroll_id !== $payroll->id) throw new \Exception("Allowance tidak valid untuk payroll ini.");

        DB::beginTransaction();
        try {
            $allowance->update([
                'amount' => $amount,
                'amount_enc' => CryptoService::encryptAESGCM((string)round($amount)),
                'is_manual_override' => true,
                'condition_notes' => $reason
            ]);

            $totalAllowances = $payroll->allowances()->sum('amount');
            $alEnc = CryptoService::encryptAESGCM((string)round($totalAllowances));
            $tot = $payroll->gaji_pokok + $totalAllowances - $payroll->total_deductions;
            $totEnc = CryptoService::encryptAESGCM((string)round($tot));

            $payroll->update([
                'tunjangan' => $totalAllowances,
                'total_allowances' => $totalAllowances,
                'total' => $tot,
                'tunjangan_enc' => $alEnc,
                'total_allowances_enc' => $alEnc,
                'total_enc' => $totEnc
            ]);

            AuditLog::create([
                'user_id' => $recordedBy,
                'action' => 'PAYROLL_ALLOWANCE_OVERRIDE',
                'payroll_id' => $payroll->id,
                'meta' => ['allowance_id' => $allowance->id, 'new_amount' => $amount, 'reason' => $reason],
                'ip_address' => request()->ip()
            ]);

            DB::commit();
            return $payroll;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
