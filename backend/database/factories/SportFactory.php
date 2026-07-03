<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SportFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'icon_url' => fake()->text(),
            'average_speed' => fake()->randomFloat(0, 0, 9999999999.),
            'max_speed' => fake()->randomFloat(0, 0, 9999999999.),
            'comb_mult_1' => fake()->randomFloat(0, 0, 9999999999.),
            'comb_mult_2' => fake()->randomFloat(0, 0, 9999999999.),
            'comb_mult_3' => fake()->randomFloat(0, 0, 9999999999.),
            'comb_mult_4' => fake()->randomFloat(0, 0, 9999999999.),
        ];
    }
}
