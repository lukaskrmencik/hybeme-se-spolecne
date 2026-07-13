<?php

namespace App\Models;

use App\Models\Visit;
use App\Models\VisitsPhoto;
use Clickbar\Magellan\Data\Geometries\Point;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Place extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'coordinates',
        'image_url',
        'default_reward',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'coordinates' => Point::class,
        ];
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function latestVisits(): Collection
    {
        return $this->visits()
            ->latest('timestamp')
            ->limit(config('general.placeLatestVisitsCount', 10))
            ->with(['user', 'sport', 'photos'])
            ->get();
    }

    public function photos(): HasManyThrough
    {
        return $this->hasManyThrough(VisitsPhoto::class, Visit::class);
    }
}
