<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Visit;

class VisitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

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
