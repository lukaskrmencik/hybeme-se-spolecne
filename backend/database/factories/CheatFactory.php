<?php

namespace Database\Factories;

use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

class CheatFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'visit_id' => Visit::factory(),
            'visit_id_2' => Visit::factory(),
            'user_message' => fake()->text(),
            'is_denied' => fake()->boolean(),
            'cheat_description' => fake()->text(),
        ];
    }
}
