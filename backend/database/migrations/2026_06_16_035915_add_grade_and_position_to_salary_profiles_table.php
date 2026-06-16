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
        Schema::table('salary_profiles', function (Blueprint $table) {
            $table->foreignId('grade_id')
                ->nullable()
                ->after('employee_id')
                ->constrained('grades')
                ->nullOnDelete();

            $table->string('position', 255)->nullable()->after('grade_id');
        });

        // Copy current employee grade and position to historical profiles
        \DB::table('salary_profiles')
            ->join('employees', 'salary_profiles.employee_id', '=', 'employees.id')
            ->update([
                'salary_profiles.grade_id' => \DB::raw('employees.grade_id'),
                'salary_profiles.position' => \DB::raw('employees.position'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary_profiles', function (Blueprint $table) {
            $table->dropForeign(['grade_id']);
            $table->dropColumn(['grade_id', 'position']);
        });
    }
};
