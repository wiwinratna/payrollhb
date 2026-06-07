<?php

namespace App\Http\Controllers\Api;

use App\Models\ProjectAssignment;
use Illuminate\Http\Request;

class ProjectAssignmentController extends Phase3Controller
{
    public function index(Request $request)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        $query = ProjectAssignment::query();
        if ($user->role === 'staff' || $user->role === 'employee') {
            $query->where('employee_id', $user->employee_id ?? -1);
        }
        return response()->json($query->get());
    }

    public function show(Request $request, ProjectAssignment $projectAssignment)
    {
        if (!$this->canRead($request->user())) abort(403);
        $user = $request->user();
        if (($user->role === 'staff' || $user->role === 'employee') && $projectAssignment->employee_id !== $user->employee_id) {
            abort(403);
        }
        return response()->json($projectAssignment);
    }

    public function store(Request $request)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'project_id' => 'required|exists:projects,id',
            'period_month' => 'required|string|size:7',
            'mandays' => 'numeric',
            'num_trips' => 'integer',
            'notes' => 'nullable|string',
        ]);
        $data['created_by'] = $request->user()->id;
        $assignment = ProjectAssignment::create($data);
        $this->auditLog($request, 'PROJECT_ASSIGNMENT_CREATE', ['assignment_id' => $assignment->id]);
        return response()->json($assignment, 201);
    }

    public function update(Request $request, ProjectAssignment $projectAssignment)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'employee_id' => 'exists:employees,id',
            'project_id' => 'exists:projects,id',
            'period_month' => 'string|size:7',
            'mandays' => 'numeric',
            'num_trips' => 'integer',
            'notes' => 'nullable|string',
        ]);
        $projectAssignment->update($data);
        $this->auditLog($request, 'PROJECT_ASSIGNMENT_UPDATE', ['assignment_id' => $projectAssignment->id]);
        return response()->json($projectAssignment);
    }

    public function destroy(Request $request, ProjectAssignment $projectAssignment)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $projectAssignment->delete();
        $this->auditLog($request, 'PROJECT_ASSIGNMENT_DELETE', ['assignment_id' => $projectAssignment->id]);
        return response()->json(['message' => 'Deleted']);
    }
}
