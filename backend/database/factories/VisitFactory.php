<?php

namespace Database\Factories;

use App\Models\Place;
use App\Models\Sport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class VisitFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'reward' => fake()->numberBetween(-10000, 10000),
            'user_id' => User::factory(),
            'place_id' => Place::factory(),
            'sport_id' => Sport::factory(),
            'is_combination' => fake()->boolean(),
            'timestamp' => fake()->dateTime(),
        ];
    }
}
