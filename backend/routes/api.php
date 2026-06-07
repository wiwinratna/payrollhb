<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PayrollReportController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\EmploymentTypeController;
use App\Http\Controllers\Api\WorkBasisController;
use App\Http\Controllers\Api\AllowanceTypeController;
use App\Http\Controllers\Api\GradeAllowanceRateController;



Route::post('/login', [AuthController::class, 'login']);

// Kalau mau staff bisa register dari halaman login, aktifkan ini:
// Route::post('/register', [AuthController::class, 'registerStaff']);

Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

/*
|--------------------------------------------------------------------------
| PROTECTED ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | DASHBOARD
    |--------------------------------------------------------------------------
    */
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/hcga', [DashboardController::class, 'hcga']); // ✅ HCGA dashboard (HR/Admin focus)
    Route::get('/reports/payroll', [PayrollReportController::class, 'index']);

    /*
    |--------------------------------------------------------------------------
    | PAYROLL
    |--------------------------------------------------------------------------
    */
    // Phase 4 Routes (Placed ABOVE resource / dynamic param routes)
    // Phase 4 Routes (Placed ABOVE resource / dynamic param routes)
    Route::post('/payrolls/preview-calculation', [\App\Http\Controllers\Api\PayrollCalculationController::class, 'previewCalculation']);
    Route::post('/payrolls/auto', [\App\Http\Controllers\Api\PayrollCalculationController::class, 'autoCalculate']);
    Route::post('/payrolls/batch-generate', [\App\Http\Controllers\Api\PayrollCalculationController::class, 'batchGenerate']);
    
    // Phase 4 Specific Item Routes
    Route::post('/payrolls/{payroll}/recalculate', [\App\Http\Controllers\Api\PayrollCalculationController::class, 'recalculate']);
    Route::patch('/payrolls/{payroll}/allowances/{allowance}', [\App\Http\Controllers\Api\PayrollCalculationController::class, 'overrideAllowance']);

    Route::get('/payrolls', [PayrollController::class, 'index']);
    Route::post('/payrolls', [PayrollController::class, 'store']);

    Route::get('/payrolls/{payroll}', [PayrollController::class, 'show']);
    Route::put('/payrolls/{payroll}', [PayrollController::class, 'update']);
    Route::patch('/payrolls/{payroll}', [PayrollController::class, 'update']);
    Route::delete('/payrolls/{payroll}', [PayrollController::class, 'destroy']);

    // workflow actions
    Route::post('/payrolls/{payroll}/request-payment', [PayrollController::class, 'requestPayment']);
    Route::post('/payrolls/{payroll}/approve', [PayrollController::class, 'approvePayment']);
    Route::post('/payrolls/{payroll}/mark-paid', [PayrollController::class, 'markPaid']);
    Route::post('/payrolls/{payroll}/reject', [PayrollController::class, 'rejectPayment']);

    // export
    Route::get('/payrolls/{payroll}/pdf', [PayrollController::class, 'pdf']);

    Route::get('/payrolls/{payroll}/proof', [PayrollController::class, 'proof']);

    /*
    |--------------------------------------------------------------------------
    | EMPLOYEES
    |--------------------------------------------------------------------------
    | Penting: taruh route static dulu (next-code) sebelum {employee}
    */
    Route::get('/employees/next-code', [EmployeeController::class, 'nextCode']);
    Route::post('/employees/{employee}/create-user', [EmployeeController::class, 'createUser']);

    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);

    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::patch('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);

    // salary profile
    Route::get('/employees/{employee}/salary-profile', [EmployeeController::class, 'salaryProfile']);
    Route::post('/employees/{employee}/salary-profiles', [EmployeeController::class, 'storeSalaryProfile']);

    /*
    |--------------------------------------------------------------------------
    | ADMIN USERS (kalau masih dipakai)
    |--------------------------------------------------------------------------
    | Catatan: kalau create account sudah via /employees/{employee}/create-user,
    | route ini bisa kamu hapus nanti biar nggak dobel.
    */
    Route::post('/admin/users', [AdminUserController::class, 'store']);

    /*
    |--------------------------------------------------------------------------
    | ME (Profil user login)
    |--------------------------------------------------------------------------
    */
    Route::get('/me', [MeController::class, 'me']);
    Route::put('/me', [MeController::class, 'updateMe']);
    Route::put('/me/password', [MeController::class, 'updatePassword']);

    Route::get('/me/employee', [MeController::class, 'employee']);
    Route::put('/me/employee', [MeController::class, 'updateEmployee']);

    /*
    |--------------------------------------------------------------------------
    | MASTER DATA (Phase 1)
    |--------------------------------------------------------------------------
    */
    Route::prefix('master')->group(function () {
        Route::apiResource('grades', GradeController::class);
        Route::get('employment-types', [EmploymentTypeController::class, 'index']);
        Route::get('work-bases', [WorkBasisController::class, 'index']);
        Route::apiResource('allowance-types', AllowanceTypeController::class);
        Route::apiResource('grade-allowance-rates', GradeAllowanceRateController::class);
    });

    /*
    |--------------------------------------------------------------------------
    | PHASE 3: ATTENDANCE, SCHEDULE, PROJECT ASSIGNMENT, MANDAYS SUMMARY
    |--------------------------------------------------------------------------
    */
    Route::apiResource('projects', \App\Http\Controllers\Api\ProjectController::class);
    Route::apiResource('project-assignments', \App\Http\Controllers\Api\ProjectAssignmentController::class);
    Route::apiResource('schedules', \App\Http\Controllers\Api\ScheduleController::class);
    Route::apiResource('attendances', \App\Http\Controllers\Api\AttendanceController::class);

    Route::get('/mandays-summaries', [\App\Http\Controllers\Api\MandaysSummaryController::class, 'index']);
    Route::get('/mandays-summaries/{mandaysSummary}', [\App\Http\Controllers\Api\MandaysSummaryController::class, 'show']);
    Route::post('/mandays-summaries/recalculate', [\App\Http\Controllers\Api\MandaysSummaryController::class, 'recalculate']);
    Route::post('/mandays-summaries/{mandaysSummary}/finalize', [\App\Http\Controllers\Api\MandaysSummaryController::class, 'finalize']);
    Route::post('/mandays-summaries/{mandaysSummary}/unfinalize', [\App\Http\Controllers\Api\MandaysSummaryController::class, 'unfinalize']);
});
