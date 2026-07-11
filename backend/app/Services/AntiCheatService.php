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
            return (object)[
                'isCheating' => false,
                'solution' => null,
                'cheatMessage' => null
            ];
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

        if ($visitData['is_combination'] === true) {
            $recentCombinations = $user->visitsCombinations()->reverse();
            $alreadyVisitedInThisCombination = false;

            foreach ($recentCombinations as $existingVisit) {
                if ($existingVisit->place_id == $visitData['place_id']) {
                    $alreadyVisitedInThisCombination = true;
                }

                if ($existingVisit->combination_order === 0) {
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

            return (object)[
                'isCheating' => false,
                'solution' => null,
                'cheatMessage' => null
            ];
        }

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

        $minimalTimeBetweenVisitsInMinutes = config('general.minimalTimeBetweenVisitsInMinutes');

        if ($totalTimeInSeconds < $minimalTimeBetweenVisitsInMinutes * 60) {
            return (object)[
                'isCheating' => true,
                'solution' => 'not_save',
                'cheatMessage' => "Čas mezi návštěvami je příliš krátký. Čas mezi návštěvami: {$totalTimeInSeconds} sekund. Minimální čas mezi návštěvami: {$minimalTimeBetweenVisitsInMinutes} minut."
            ];
        }

        return (object)[
            'isCheating' => false,
            'solution' => null,
            'cheatMessage' => null
        ];
    }
}
