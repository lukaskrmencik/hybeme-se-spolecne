<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PlaceFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'coordinates' => fake()->word(),
            'image_url' => fake()->text(),
            'default_reward' => fake()->numberBetween(-10000, 10000),
        ];
    }
}
