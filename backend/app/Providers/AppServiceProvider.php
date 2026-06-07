<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Payroll;
use App\Policies\PayrollPolicy;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Payroll::class, PayrollPolicy::class);

        \App\Models\Attendance::observe(\App\Observers\AttendanceObserver::class);
        \App\Models\ProjectAssignment::observe(\App\Observers\ProjectAssignmentObserver::class);
    }

}
