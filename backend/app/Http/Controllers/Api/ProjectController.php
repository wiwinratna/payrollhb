<?php

namespace App\Http\Controllers\Api;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Phase3Controller
{
    public function index(Request $request)
    {
        if (!$this->canRead($request->user())) abort(403);
        return response()->json(Project::all());
    }

    public function show(Request $request, Project $project)
    {
        if (!$this->canRead($request->user())) abort(403);
        return response()->json($project);
    }

    public function store(Request $request)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'code' => 'required|string|unique:projects,code',
            'name' => 'required|string',
            'client_name' => 'nullable|string',
            'location' => 'nullable|string',
            'city' => 'nullable|string',
            'is_outside_city' => 'boolean',
            'is_client_provide_meal' => 'boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'in:active,inactive,completed,on_hold,cancelled',
            'description' => 'nullable|string',
        ]);
        $data['created_by'] = $request->user()->id;
        $project = Project::create($data);
        $this->auditLog($request, 'PROJECT_CREATE', ['project_id' => $project->id]);
        return response()->json($project, 201);
    }

    public function update(Request $request, Project $project)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $data = $request->validate([
            'code' => 'string|unique:projects,code,'.$project->id,
            'name' => 'string',
            'client_name' => 'nullable|string',
            'location' => 'nullable|string',
            'city' => 'nullable|string',
            'is_outside_city' => 'boolean',
            'is_client_provide_meal' => 'boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'status' => 'in:active,inactive,completed,on_hold,cancelled',
            'description' => 'nullable|string',
        ]);
        $project->update($data);
        $this->auditLog($request, 'PROJECT_UPDATE', ['project_id' => $project->id]);
        return response()->json($project);
    }

    public function destroy(Request $request, Project $project)
    {
        if (!$this->canWrite($request->user())) abort(403);
        $project->delete();
        $this->auditLog($request, 'PROJECT_DELETE', ['project_id' => $project->id]);
        return response()->json(['message' => 'Deleted']);
    }
}
