<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\MonthlyMandaysSummary;
use App\Models\Attendance;
use App\Models\ProjectAssignment;

class MandaysRecalculationService
{
    /**
     * Get the period_month (YYYY-MM) from a given date.
     * Period is 28th of previous month to 27th of current month.
     */
    public static function getPeriodMonthFromDate($dateString)
    {
        $date = Carbon::parse($dateString);
        if ($date->day >= 28) {
            return $date->copy()->addMonth()->format('Y-m');
        }
        return $date->format('Y-m');
    }

    /**
     * Get start and end date of a given period_month.
     */
    public static function getPeriodDates($periodMonth)
    {
        // e.g. '2026-06' -> end date is '2026-06-27'
        $end = Carbon::createFromFormat('Y-m-d', $periodMonth . '-27')->endOfDay();
        $start = $end->copy()->subMonth()->addDay()->startOfDay(); // 28th of previous month
        return [$start, $end];
    }

    /**
     * Recalculate summary for an employee and period.
     */
    public static function recalculate($employeeId, $periodMonth)
    {
        [$start, $end] = self::getPeriodDates($periodMonth);

        $summary = MonthlyMandaysSummary::firstOrCreate(
            ['employee_id' => $employeeId, 'period_month' => $periodMonth],
            [
                'period_from' => $start->toDateString(),
                'period_to' => $end->toDateString(),
                'total_mandays' => 0
            ]
        );

        if ($summary->is_finalized) {
            // Do not update if already finalized
            return $summary;
        }

        // Make sure dates are set properly in case it was created earlier with defaults
        $summary->period_from = $start->toDateString();
        $summary->period_to = $end->toDateString();

        // 1. Calculate from Attendances
        $attendances = Attendance::where('employee_id', $employeeId)
            ->whereBetween('attendance_date', [$start->toDateString(), $end->toDateString()])
            ->get();

        $summary->mandays_project = $attendances->where('attendance_type', 'project')->count();
        $summary->mandays_ho_wfo = $attendances->where('attendance_type', 'ho_wfo')->count();
        $summary->mandays_ho_wfh = $attendances->where('attendance_type', 'ho_wfh')->count();
        $summary->mandays_training = $attendances->where('attendance_type', 'training')->count();
        $summary->mandays_outside_city = $attendances->where('attendance_type', 'outside_city')->count();
        $summary->mandays_leave = $attendances->where('attendance_type', 'leave')->count();
        
        // Sum of all working mandays (WFH is NOT counted for daily mandays multiplier)
        $summary->total_mandays = $summary->mandays_project + 
            $summary->mandays_ho_wfo + 
            $summary->mandays_training + 
            $summary->mandays_outside_city;

        // 2. Calculate from Project Assignments
        $assignments = ProjectAssignment::where('employee_id', $employeeId)
            ->where('period_month', $periodMonth)
            ->get();
            
        $summary->num_trips = $assignments->sum('num_trips');

        $summary->last_recalculated_at = now();
        $summary->save();

        return $summary;
    }
}
