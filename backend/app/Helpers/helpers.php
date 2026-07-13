<?php

use App\Models\Place;
use App\Models\Sport;
use App\Models\User;
use Clickbar\Magellan\Database\PostgisFunctions\ST;
use Illuminate\Support\Facades\DB;

if (! function_exists('calc_combination_reward')) {

    function calc_combination_reward(User $user, int $sportId, int $placeId, int $defaultReward,$lastVisit): int
    {
        $visitSport = Sport::findOrFail($sportId);
        $lastVisitComb = $lastVisit->combination_order;
        $combMultLevel = min($lastVisitComb + 1, 4);
        $combMultField = 'comb_mult_' . $combMultLevel;
        $combMult = $visitSport->{$combMultField};
        $visitCoords = Place::findOrFail($placeId)->coordinates;
        $lastVisitCoords = $lastVisit->place->coordinates;
        $distanceInMeters = DB::query()
            ->select(ST::distanceSphere($visitCoords, $lastVisitCoords)->as('distance'))
            ->first()
            ->distance;
        $distanceInKilometers = $distanceInMeters / 1000;
        $pointsPerKilometer = config('general.pointsPerKilometer');

        $reward = floor(($defaultReward + ($distanceInKilometers * $pointsPerKilometer)) * $combMult);

        return $reward;
    }
}
