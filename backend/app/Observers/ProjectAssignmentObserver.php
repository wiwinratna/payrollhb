<?php

namespace App\Observers;

use App\Models\ProjectAssignment;
use App\Models\MonthlyMandaysSummary;
use App\Services\MandaysRecalculationService;

class ProjectAssignmentObserver
{
    private function ensureNotFinalized($employeeId, $period)
    {
        $summary = MonthlyMandaysSummary::where('employee_id', $employeeId)
            ->where('period_month', $period)
            ->first();
        if ($summary && $summary->is_finalized) {
            abort(422, "Data assignment untuk periode $period sudah difinalisasi. Silakan unfinalize terlebih dahulu.");
        }
    }

    public function creating(ProjectAssignment $assignment)
    {
        $this->ensureNotFinalized($assignment->employee_id, $assignment->period_month);
    }

    public function created(ProjectAssignment $assignment)
    {
        MandaysRecalculationService::recalculate($assignment->employee_id, $assignment->period_month);
    }

    public function updating(ProjectAssignment $assignment)
    {
        $oldPeriod = $assignment->getOriginal('period_month');
        $newPeriod = $assignment->period_month;
        $oldEmployee = $assignment->getOriginal('employee_id');
        $newEmployee = $assignment->employee_id;

        if ($oldEmployee !== $newEmployee || $oldPeriod !== $newPeriod) {
            $this->ensureNotFinalized($oldEmployee, $oldPeriod);
        }
        $this->ensureNotFinalized($newEmployee, $newPeriod);
    }

    public function updated(ProjectAssignment $assignment)
    {
        $oldPeriod = $assignment->getOriginal('period_month');
        $newPeriod = $assignment->period_month;
        $oldEmployee = $assignment->getOriginal('employee_id');
        $newEmployee = $assignment->employee_id;

        if ($oldEmployee !== $newEmployee || $oldPeriod !== $newPeriod) {
            MandaysRecalculationService::recalculate($oldEmployee, $oldPeriod);
        }
        MandaysRecalculationService::recalculate($newEmployee, $newPeriod);
    }

    public function deleting(ProjectAssignment $assignment)
    {
        $this->ensureNotFinalized($assignment->getOriginal('employee_id'), $assignment->getOriginal('period_month'));
    }

    public function deleted(ProjectAssignment $assignment)
    {
        MandaysRecalculationService::recalculate($assignment->getOriginal('employee_id'), $assignment->getOriginal('period_month'));
    }
}
