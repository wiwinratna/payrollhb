<?php

namespace App\Http\Controllers\Api;

use App\Models\Attendance;
use Illuminate\Http\Request;

class AttendanceController extends Phase3Controller
{
    public function index(Request $request)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        $query = Attendance::query();
        if ($user->role === 'staff' || $user->role === 'employee') {
            $query->where('employee_id', $user->employee_id ?? -1);
        }
        return response()->json($query->get());
    }

    public function show(Request $request, Attendance $attendance)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        if (($user->role === 'staff' || $user->role === 'employee') && $attendance->employee_id !== $user->employee_id) {
            abort(403);
        }
        return response()->json($attendance);
    }

    public function store(Request $request)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'attendance_date' => 'required|date',
            'attendance_type' => 'required|in:project,ho_wfo,ho_wfh,training,outside_city,leave,absent,holiday',
            'project_id' => 'nullable|exists:projects,id',
            'schedule_id' => 'nullable|exists:schedules,id',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'overtime_hours' => 'numeric',
            'notes' => 'nullable|string',
        ]);
        $data['recorded_by'] = $request->user()->id;
        $attendance = Attendance::create($data);
        $this->auditLog($request, 'ATTENDANCE_CREATE', ['attendance_id' => $attendance->id]);
        return response()->json($attendance, 201);
    }

    public function update(Request $request, Attendance $attendance)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'exists:employees,id',
            'attendance_date' => 'date',
            'attendance_type' => 'in:project,ho_wfo,ho_wfh,training,outside_city,leave,absent,holiday',
            'project_id' => 'nullable|exists:projects,id',
            'schedule_id' => 'nullable|exists:schedules,id',
            'check_in' => 'nullable|date',
            'check_out' => 'nullable|date',
            'overtime_hours' => 'numeric',
            'notes' => 'nullable|string',
        ]);
        $attendance->update($data);
        $this->auditLog($request, 'ATTENDANCE_UPDATE', ['attendance_id' => $attendance->id]);
        return response()->json($attendance);
    }

    public function destroy(Request $request, Attendance $attendance)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $attendance->delete();
        $this->auditLog($request, 'ATTENDANCE_DELETE', ['attendance_id' => $attendance->id]);
        return response()->json(['message' => 'Deleted']);
    }
}
