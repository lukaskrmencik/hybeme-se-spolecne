<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Visit;

class VisitPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    public function uploadPhoto(User $user, Visit $visit): bool
    {
        return $user->id === $visit->user_id;
    }

    public function deletePhoto(User $user, Visit $visit): bool
    {
        return $user->id === $visit->user_id || $user->role === 'admin';
    }
}
