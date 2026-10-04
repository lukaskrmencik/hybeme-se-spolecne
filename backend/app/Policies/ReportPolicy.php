<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;

class ReportPolicy
{
    /** Any signed-in user may report content. */
    public function create(User $user): bool
    {
        return true;
    }

    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function update(User $user, Report $report): bool
    {
        return $user->role === 'admin';
    }
}
