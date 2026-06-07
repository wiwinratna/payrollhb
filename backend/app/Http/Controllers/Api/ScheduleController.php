<?php

namespace App\Http\Controllers\Api;

use App\Models\Schedule;
use Illuminate\Http\Request;

class ScheduleController extends Phase3Controller
{
    public function index(Request $request)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        $query = Schedule::query();
        if ($user->role === 'staff' || $user->role === 'employee') {
            $query->where('employee_id', $user->employee_id ?? -1);
        }
        return response()->json($query->get());
    }

    public function show(Request $request, Schedule $schedule)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        if (($user->role === 'staff' || $user->role === 'employee') && $schedule->employee_id !== $user->employee_id) {
            abort(403);
        }
        return response()->json($schedule);
    }

    public function store(Request $request)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'schedule_date' => 'required|date',
            'schedule_type' => 'required|in:project,ho_wfo,ho_wfh,training,leave,holiday,remote',
            'project_id' => 'nullable|exists:projects,id',
            'location' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        $data['created_by'] = $request->user()->id;
        $schedule = Schedule::create($data);
        $this->auditLog($request, 'SCHEDULE_CREATE', ['schedule_id' => $schedule->id]);
        return response()->json($schedule, 201);
    }

    public function update(Request $request, Schedule $schedule)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'exists:employees,id',
            'schedule_date' => 'date',
            'schedule_type' => 'in:project,ho_wfo,ho_wfh,training,leave,holiday,remote',
            'project_id' => 'nullable|exists:projects,id',
            'location' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        $schedule->update($data);
        $this->auditLog($request, 'SCHEDULE_UPDATE', ['schedule_id' => $schedule->id]);
        return response()->json($schedule);
    }

    public function destroy(Request $request, Schedule $schedule)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $schedule->delete();
        $this->auditLog($request, 'SCHEDULE_DELETE', ['schedule_id' => $schedule->id]);
        return response()->json(['message' => 'Deleted']);
    }
}
