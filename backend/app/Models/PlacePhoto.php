<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Photo of a place added by an admin (visitors' photos are VisitsPhoto). */
class PlacePhoto extends Model
{
    protected $fillable = [
        'place_id',
        'photo_url',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'place_id' => 'integer',
        ];
    }

    public function place(): BelongsTo
    {
        return $this->belongsTo(Place::class);
    }
}
