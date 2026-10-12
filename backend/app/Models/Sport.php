<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sport extends Model
{
    public const MAPY_ROUTE_TYPES = ['foot_fast', 'foot_hiking', 'bike_road', 'bike_mountain'];

    protected $fillable = [
        'name',
        'icon_url',
        'average_speed',
        'max_speed',
        'min_speed',
        'comb_mult_1',
        'comb_mult_2',
        'comb_mult_3',
        'comb_mult_4',
        'mapy_route_type',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'average_speed' => 'float',
            'max_speed' => 'float',
            'min_speed' => 'float',
            'is_active' => 'boolean',
            'comb_mult_1' => 'float',
            'comb_mult_2' => 'float',
            'comb_mult_3' => 'float',
            'comb_mult_4' => 'float',
        ];
    }
}
