<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PayrollReportController;

/*
|--------------------------------------------------------------------------
| AUTH (PUBLIC)
|--------------------------------------------------------------------------
*/
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

});
