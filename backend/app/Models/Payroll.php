<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    protected $fillable = [
        'user_id',
        'employee_id',
        'periode',

        'status',
        'requested_by', 'requested_at',
        'approved_by', 'approved_at',
        'paid_by', 'paid_at',
        'approval_note',

        // plaintext (kalau masih TRANSITION, kalau cipher-only biasanya null)
        'gaji_pokok','tunjangan','potongan','total','catatan',

        // ciphertext
        'gaji_pokok_enc','tunjangan_enc','potongan_enc','total_enc','catatan_enc',

        // ✅ HYBRID fields
        'dek_enc',
        'enc_meta',

        // meta algoritma
        'salary_alg',
        'salary_key_id',

        'paid_proof_path',
        'paid_proof_uploaded_by',
        'paid_proof_uploaded_at',
        'paid_ref',
        'paid_note',

    ];

    protected $hidden = [
        'gaji_pokok_enc',
        'tunjangan_enc',
        'potongan_enc',
        'total_enc',
        'catatan_enc',

        // optional: kalau kamu mau sembunyikan juga
        // 'dek_enc',
        // 'enc_meta',
    ];

    protected $casts = [
        'periode' => 'date',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',

        // ✅ supaya enc_meta otomatis jadi array
        'enc_meta' => 'array',
    ];

    protected $attributes = [
        'status' => 'draft',
    ];

    public function employee()
    {
        return $this->belongsTo(\App\Models\Employee::class);
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }
}
