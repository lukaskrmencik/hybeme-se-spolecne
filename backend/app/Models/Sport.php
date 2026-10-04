<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sport extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
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
