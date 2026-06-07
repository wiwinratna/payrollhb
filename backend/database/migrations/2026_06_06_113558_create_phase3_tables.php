<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('client_name')->nullable();
            $table->string('location')->nullable();
            $table->string('city')->nullable();
            $table->boolean('is_outside_city')->default(false);
            $table->boolean('is_client_provide_meal')->default(false);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'completed', 'on_hold', 'cancelled'])->default('active');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('project_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->char('period_month', 7); // e.g., 2026-06
            $table->decimal('mandays', 8, 2)->default(0);
            $table->integer('num_trips')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->unique(['employee_id', 'project_id', 'period_month'], 'proj_assign_emp_proj_period_unique');
        });

        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('schedule_date');
            $table->enum('schedule_type', ['project', 'ho_wfo', 'ho_wfh', 'training', 'leave', 'holiday', 'remote']);
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'schedule_date'], 'schedules_emp_date_unique');
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->date('attendance_date');
            $table->enum('attendance_type', ['project', 'ho_wfo', 'ho_wfh', 'training', 'outside_city', 'leave', 'absent', 'holiday']);
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('schedule_id')->nullable()->constrained('schedules')->nullOnDelete();
            $table->dateTime('check_in')->nullable();
            $table->dateTime('check_out')->nullable();
            $table->decimal('overtime_hours', 8, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'attendance_date'], 'attendances_emp_date_unique');
        });

        Schema::create('monthly_mandays_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->char('period_month', 7); // e.g., 2026-06
            $table->date('period_from'); // 2026-05-28
            $table->date('period_to'); // 2026-06-27
            $table->decimal('mandays_project', 8, 2)->default(0);
            $table->decimal('mandays_ho_wfo', 8, 2)->default(0);
            $table->decimal('mandays_ho_wfh', 8, 2)->default(0);
            $table->decimal('mandays_training', 8, 2)->default(0);
            $table->decimal('mandays_outside_city', 8, 2)->default(0);
            $table->decimal('mandays_leave', 8, 2)->default(0);
            $table->decimal('total_mandays', 8, 2)->default(0);
            $table->integer('num_trips')->default(0);
            $table->integer('working_days_in_period')->nullable();
            
            $table->boolean('is_finalized')->default(false);
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('finalized_at')->nullable();
            $table->dateTime('last_recalculated_at')->nullable();
            
            $table->timestamps();

            $table->unique(['employee_id', 'period_month'], 'mandays_summary_emp_period_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monthly_mandays_summaries');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('schedules');
        Schema::dropIfExists('project_assignments');
        Schema::dropIfExists('projects');
    }
};
