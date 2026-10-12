<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitsPhoto extends Model
{
    protected $fillable = [
        'visit_id',
        'photo_url',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'visit_id' => 'integer',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }
}
