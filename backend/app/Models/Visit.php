<?php

namespace App\Models;

use App\Models\VisitsPhoto;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visit extends Model
{
    protected $fillable = [
        'reward',
        'user_id',
        'place_id',
        'sport_id',
        'is_combination',
        'timestamp',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'user_id' => 'integer',
            'place_id' => 'integer',
            'sport_id' => 'integer',
            'is_combination' => 'boolean',
            'timestamp' => 'datetime:d.m.Y H:i:s',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function place(): BelongsTo
    {
        return $this->belongsTo(Place::class);
    }

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function photos()
    {
        return $this->hasMany(VisitsPhoto::class);
    }
}
