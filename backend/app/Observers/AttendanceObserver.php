<?php

namespace App\Observers;

use App\Models\Attendance;
use App\Models\MonthlyMandaysSummary;
use App\Services\MandaysRecalculationService;

class AttendanceObserver
{
    private function ensureNotFinalized($employeeId, $period)
    {
        $summary = MonthlyMandaysSummary::where('employee_id', $employeeId)
            ->where('period_month', $period)
            ->first();
        if ($summary && $summary->is_finalized) {
            abort(422, "Data untuk periode $period sudah difinalisasi. Silakan unfinalize terlebih dahulu.");
        }
    }

    public function creating(Attendance $attendance)
    {
        $period = MandaysRecalculationService::getPeriodMonthFromDate($attendance->attendance_date);
        $this->ensureNotFinalized($attendance->employee_id, $period);
    }

    public function created(Attendance $attendance)
    {
        $period = MandaysRecalculationService::getPeriodMonthFromDate($attendance->attendance_date);
        MandaysRecalculationService::recalculate($attendance->employee_id, $period);
    }

    public function updating(Attendance $attendance)
    {
        $oldDate = $attendance->getOriginal('attendance_date');
        $newDate = $attendance->attendance_date;
        $oldEmployee = $attendance->getOriginal('employee_id');
        $newEmployee = $attendance->employee_id;

        $oldPeriod = MandaysRecalculationService::getPeriodMonthFromDate($oldDate);
        $newPeriod = MandaysRecalculationService::getPeriodMonthFromDate($newDate);

        if ($oldEmployee !== $newEmployee || $oldPeriod !== $newPeriod) {
            $this->ensureNotFinalized($oldEmployee, $oldPeriod);
        }
        $this->ensureNotFinalized($newEmployee, $newPeriod);
    }

    public function updated(Attendance $attendance)
    {
        $oldDate = $attendance->getOriginal('attendance_date');
        $newDate = $attendance->attendance_date;
        $oldEmployee = $attendance->getOriginal('employee_id');
        $newEmployee = $attendance->employee_id;

        $oldPeriod = MandaysRecalculationService::getPeriodMonthFromDate($oldDate);
        $newPeriod = MandaysRecalculationService::getPeriodMonthFromDate($newDate);

        if ($oldEmployee !== $newEmployee || $oldPeriod !== $newPeriod) {
            MandaysRecalculationService::recalculate($oldEmployee, $oldPeriod);
        }
        MandaysRecalculationService::recalculate($newEmployee, $newPeriod);
    }

    public function deleting(Attendance $attendance)
    {
        $period = MandaysRecalculationService::getPeriodMonthFromDate($attendance->getOriginal('attendance_date'));
        $this->ensureNotFinalized($attendance->getOriginal('employee_id'), $period);
    }

    public function deleted(Attendance $attendance)
    {
        $period = MandaysRecalculationService::getPeriodMonthFromDate($attendance->getOriginal('attendance_date'));
        MandaysRecalculationService::recalculate($attendance->getOriginal('employee_id'), $period);
    }
}
