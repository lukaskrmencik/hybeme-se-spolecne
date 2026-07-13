<?php

namespace App\Policies;

use App\Models\Cheat;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CheatPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Cheat $cheat): bool
    {
        return $user->id === $cheat->visit->user_id || $user->role === 'admin';
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Cheat $cheat): bool
    {
        return false;
    }

    /**
     * Determine whether the user can deny the cheat.
     */
    public function deny(User $user, Cheat $cheat): bool
    {
        return $user->role === 'admin';
    }

    public function messageAdmin(User $user, Cheat $cheat): bool
    {
        return $user->id === $cheat->visit->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Cheat $cheat): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Cheat $cheat): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Cheat $cheat): bool
    {
        return false;
    }
}
