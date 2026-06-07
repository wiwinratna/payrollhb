<?php

namespace App\Http\Controllers\Api;

use App\Models\MonthlyMandaysSummary;
use App\Models\Payroll;
use App\Services\MandaysRecalculationService;
use Illuminate\Http\Request;

class MandaysSummaryController extends Phase3Controller
{
    public function index(Request $request)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        $query = MonthlyMandaysSummary::query();
        if ($user->role === 'staff' || $user->role === 'employee') {
            $query->where('employee_id', $user->employee_id ?? -1);
        }
        return response()->json($query->get());
    }

    public function show(Request $request, MonthlyMandaysSummary $mandaysSummary)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        if (($user->role === 'staff' || $user->role === 'employee') && $mandaysSummary->employee_id !== $user->employee_id) {
            abort(403);
        }
        return response()->json($mandaysSummary);
    }

    public function recalculate(Request $request)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'period_month' => 'required|string|size:7',
        ]);
        
        $summary = MandaysRecalculationService::recalculate($data['employee_id'], $data['period_month']);
        $this->auditLog($request, 'MANDAYS_RECALCULATE', ['summary_id' => $summary->id]);
        return response()->json(['message' => 'Recalculated', 'summary' => $summary]);
    }

    public function finalize(Request $request, MonthlyMandaysSummary $mandaysSummary)
    {
        if (!$this->canWrite($request->user())) abort(403);
        
        $mandaysSummary->update([
            'is_finalized' => true,
            'finalized_by' => $request->user()->id,
            'finalized_at' => now(),
        ]);
        $this->auditLog($request, 'MANDAYS_FINALIZE', ['summary_id' => $mandaysSummary->id]);
        return response()->json(['message' => 'Finalized', 'summary' => $mandaysSummary]);
    }

    public function unfinalize(Request $request, MonthlyMandaysSummary $mandaysSummary)
    {
        if (!$this->canWrite($request->user())) abort(403);

        $prefix = substr($mandaysSummary->period_month, 0, 7);
        $payroll = Payroll::where('employee_id', $mandaysSummary->employee_id)
            ->where('periode', 'like', $prefix . '-%')
            ->first();

        if ($payroll && in_array($payroll->status, ['requested', 'approved', 'paid'])) {
            return response()->json(['message' => 'Tidak bisa unfinalize karena payroll sudah ' . $payroll->status], 422);
        }

        $mandaysSummary->update([
            'is_finalized' => false,
            'finalized_by' => null,
            'finalized_at' => null,
        ]);
        $this->auditLog($request, 'MANDAYS_UNFINALIZE', ['summary_id' => $mandaysSummary->id]);
        return response()->json(['message' => 'Unfinalized', 'summary' => $mandaysSummary]);
    }
}
