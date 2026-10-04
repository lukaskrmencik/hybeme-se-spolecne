<?php

namespace App\Services;

use App\Models\Place;
use App\Models\Sport;
use App\Models\User;
use Clickbar\Magellan\Database\PostgisFunctions\ST;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AntiCheatService
{
    public function checkNewVisit($visitData, User $user): object
    {
        $lastVisit = $user->visitsCombinations()->last();

        if (!$lastVisit) {
            return $this->ok();
        }

        $visitTime = Carbon::parse($visitData['timestamp']);
        $lastVisitTime = Carbon::parse($lastVisit->timestamp);

        if (!$visitTime->isAfter($lastVisitTime)) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_save',
                'cheatMessage' => "Čas návštěvy je dřívější než čas poslední návštěvy. Čas návštěvy: {$visitTime}, Čas poslední návštěvy: {$lastVisitTime}."
            ];
        }

        $totalTimeInSeconds = $lastVisitTime->diffInSeconds($visitTime);

        // A place scores once per cooldown, as a regular visit or as a combination alike.
        // Otherwise a new combination chain could collect the same places again right away.
        $cooldownResult = $this->checkPlaceCooldown($visitData, $user, $visitTime);
        if ($cooldownResult->isCheating) {
            return $cooldownResult;
        }

        if (filter_var($visitData['is_combination'], FILTER_VALIDATE_BOOLEAN)) {
            $combinationResult = $this->checkCombination($visitData, $user, $lastVisit, $totalTimeInSeconds);

            if ($combinationResult->solution !== 'not_combination') {
                return $combinationResult;
            }

            // A failed combination is saved as a regular visit, so it must pass the regular rules too.
            $regularResult = $this->checkRegularVisit($visitData, $user, $visitTime, $totalTimeInSeconds);

            return $regularResult->isCheating ? $regularResult : $combinationResult;
        }

        return $this->checkRegularVisit($visitData, $user, $visitTime, $totalTimeInSeconds);
    }

    private function checkCombination($visitData, User $user, $lastVisit, float $totalTimeInSeconds): object
    {
        $recentCombinations = $user->visitsCombinations()->reverse();
        $alreadyVisitedInThisCombination = false;

        foreach ($recentCombinations as $existingVisit) {
            if ($existingVisit->place_id == $visitData['place_id']) {
                $alreadyVisitedInThisCombination = true;
            }

            // The first visit of a chain is never flagged as a combination
            // (it may still be standalone until this new visit joins it).
            if (!$existingVisit->is_combination) {
                break;
            }
        }

        if ($alreadyVisitedInThisCombination) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_save',
                'cheatMessage' => "Uživatel již navštívil toto místo v rámci této kombinace."
            ];
        }

        $lastVisitSport = $lastVisit->sport;

        if ($lastVisitSport && (int) $visitData['sport_id'] !== (int) $lastVisit->sport_id) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_combination',
                'cheatMessage' => "Kombinace vyžaduje stejný sport jako předchozí návštěva ({$lastVisitSport->name}). Změna sportu kombinaci přeruší, odměna se započítá jako běžná návštěva."
            ];
        }

        $visitSport = Sport::findOrFail($visitData['sport_id']);
        $minSpeed = $visitSport->min_speed;
        $maxSpeed = $visitSport->max_speed;

        $visitCoords = Place::findOrFail($visitData['place_id'])->coordinates;
        $lastVisitCoords = $lastVisit->place->coordinates;
        $distanceInMeters = DB::query()
            ->select(ST::distanceSphere($visitCoords, $lastVisitCoords)->as('distance'))
            ->first()
            ->distance;

        $estimatedDistanceInMeters = $distanceInMeters * config('general.routingCoefficient');

        $speedInKilometersPerHour = ($estimatedDistanceInMeters / 1000) / ($totalTimeInSeconds / 3600);

        $roundedSpeed = round($speedInKilometersPerHour, 1);

        if ($speedInKilometersPerHour < $minSpeed) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_combination',
                'cheatMessage' => "Rychlost je pro sport {$visitSport->name} příliš nízká. Rychlost: {$roundedSpeed} km/h, Minimální rychlost: {$minSpeed} km/h."
            ];
        }

        if ($speedInKilometersPerHour > $maxSpeed) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_combination',
                'cheatMessage' => "Rychlost je pro sport {$visitSport->name} příliš vysoká. Rychlost: {$roundedSpeed} km/h, Maximální rychlost: {$maxSpeed} km/h."
            ];
        }

        return $this->ok();
    }

    private function checkPlaceCooldown($visitData, User $user, Carbon $visitTime): object
    {
        $alreadyVisited = $user->visitsCombinations()->contains(function ($existingVisit) use ($visitData, $visitTime) {
            $samePlace = $existingVisit->place_id == $visitData['place_id'];
            $hourDifference = Carbon::parse($existingVisit->timestamp)->diffInHours($visitTime);

            return $samePlace && $hourDifference < config('general.placeCooldownInHours');
        });

        if ($alreadyVisited) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_save',
                'cheatMessage' => "Uživatel již navštívil toto místo v posledních " . config('general.placeCooldownInHours') . " hodinách."
            ];
        }

        return $this->ok();
    }

    private function checkRegularVisit($visitData, User $user, Carbon $visitTime, float $totalTimeInSeconds): object
    {
        $minimalTimeBetweenVisitsInMinutes = config('general.minimalTimeBetweenVisitsInMinutes');

        if ($totalTimeInSeconds < $minimalTimeBetweenVisitsInMinutes * 60) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_save',
                'cheatMessage' => "Čas mezi návštěvami je příliš krátký. Čas mezi návštěvami: {$totalTimeInSeconds} sekund. Minimální čas mezi návštěvami: {$minimalTimeBetweenVisitsInMinutes} minut."
            ];
        }

        return $this->ok();
    }

    private function ok(): object
    {
        return (object)[
            'isCheating' => false,
            'solution' => null,
            'cheatMessage' => null
        ];
    }
}
