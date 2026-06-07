<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MonthlyMandaysSummary extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id', 'period_month', 'period_from', 'period_to',
        'mandays_project', 'mandays_ho_wfo', 'mandays_ho_wfh',
        'mandays_training', 'mandays_outside_city', 'mandays_leave',
        'total_mandays', 'num_trips', 'working_days_in_period',
        'is_finalized', 'finalized_by', 'finalized_at', 'last_recalculated_at'
    ];

    protected $casts = [
        'period_from' => 'date',
        'period_to' => 'date',
        'is_finalized' => 'boolean',
        'finalized_at' => 'datetime',
        'last_recalculated_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
    
    public function finalizer()
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }
}
