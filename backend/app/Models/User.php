<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        "role",
        'email',
        'provider_id',
        'provider_name',
        'password',
        'avatar_url',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array
     */
    protected $hidden = [
        'password',
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
        ];
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'user_id'    => $this->id,
            'user_name'  => $this->name,
            'user_email' => $this->email,
            'user_role'  => $this->role,
        ];
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function cheats(): HasManyThrough
    {
        return $this->hasManyThrough(Cheat::class, Visit::class);
    }

    public function visitsCombinations(): Collection
    {
        $this->visits->loadMissing(['place', 'sport', 'photos']);

        $sortedVisits = $this->visits->sortBy('timestamp')->values();

        $visitsCombinations = collect();
        $totalCount = $sortedVisits->count();

        $actualOrder = null;

        for ($i = 0; $i < $totalCount; $i++) {
            $visit = $sortedVisits[$i];

            $nextVisit = null;
            if ($i + 1 < $totalCount) {
                $nextVisit = $sortedVisits[$i + 1];
            }

            if ($visit->is_combination === true) {
                $visit->combination_order = $actualOrder;
                $actualOrder++;
            }else{
                if($nextVisit && $nextVisit->is_combination === true) {
                    $actualOrder = 0;
                    $visit->combination_order = $actualOrder;
                    $actualOrder++;
                } else {
                    $actualOrder = null;
                    $visit->combination_order = $actualOrder;
                }
            }

            $visitsCombinations->push($visit);
        }

        return $visitsCombinations;
    }

    public function totalPoints(): int
    {
        return $this->visits->sum('reward');
    }
}
