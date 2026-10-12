<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Shrinks profile photos uploaded before the app and the server did it themselves (see App\Services\AvatarImage).
Artisan::command('avatars:shrink', function () {
    $changed = 0;
    \App\Models\User::whereNotNull('avatar_url')->each(function ($user) use (&$changed) {
        $path = ltrim(str_replace(url('storage/'), '', $user->avatar_url), '/');
        if (\App\Services\AvatarImage::shrink(\Illuminate\Support\Facades\Storage::disk('public')->path($path))) {
            $changed++;
        }
    });
    $this->info("Zmenšeno profilových fotek: {$changed}");
})->purpose('Shrink stored profile photos to at most 512 px');
