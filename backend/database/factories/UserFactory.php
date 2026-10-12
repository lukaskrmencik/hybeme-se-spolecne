<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'provider_id' => fake()->text(),
            'provider_name' => fake()->word(),
            'password' => fake()->password(),
            'avatar_url' => fake()->text(),
            'email_verified_at' => now(),
        ];
    }
}
