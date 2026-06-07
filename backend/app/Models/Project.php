<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code', 'name', 'client_name', 'location', 'city',
        'is_outside_city', 'is_client_provide_meal',
        'start_date', 'end_date', 'status', 'description', 'created_by'
    ];

    protected $casts = [
        'is_outside_city' => 'boolean',
        'is_client_provide_meal' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function assignments()
    {
        return $this->hasMany(ProjectAssignment::class);
    }
}
