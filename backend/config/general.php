<?php

return [
    // Sport icons are not shown in the app yet; a fixed localhost URL broke in production.
    'default_sport_icon_url' => env('DEFAULT_SPORT_ICON_URL', ''),
    'routingCoefficient' => 1.23,
    'minimalTimeBetweenVisitsInMinutes' => 5,
    'placeCooldownInHours' => 72,
    'pointsPerKilometer' => 10,
    'placeLatestVisitsCount' => 10,
    'leaderboardMaxUsers' => 20,
    'maxPhotosPerVisit' => 5,
    // Other players see a visit only after this many hours, so nobody can follow where a child is right now.
    'publicVisitDelayHours' => 24,
    // Version of the terms of use and privacy policy; keep equal to LEGAL.termsVersion in frontend/constants/legal.ts.
    'termsVersion' => '2026-10-07',
];
