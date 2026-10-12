<?php

namespace App\Policies;

use App\Models\Sport;
use App\Models\User;

class SportPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Sport $sport): bool
    {
        return $user->role === 'admin';
    }
}
