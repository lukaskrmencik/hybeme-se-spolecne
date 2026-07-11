<?php

namespace App\Http\Controllers;

use App\Models\Cheat;
use App\Models\Place;
use App\Models\Sport;
use App\Models\Visit;
use App\Services\AntiCheatService;
use Clickbar\Magellan\Database\PostgisFunctions\ST;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VisitController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Visit::class);

        $perPage = (int) $request->input('per_page', config('pagination.per_page_default'));
        if (
            $perPage < config('pagination.per_page_min') ||
            $perPage > config('pagination.per_page_max')
        ){
            $perPage = config('pagination.per_page_default');
        }

        $query = Visit::query()->with(['user', 'place', 'sport']);

        if ($request->filled('search')) {
            $searchTerm = $request->input('search');

            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('user', function ($userQuery) use ($searchTerm) {
                    $userQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('place', function ($placeQuery) use ($searchTerm) {
                    $placeQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('sport', function ($sportQuery) use ($searchTerm) {
                    $sportQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                });
            });
        }
        $visits = $query->paginate($perPage);

        return response()->pagination($visits);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, AntiCheatService $antiCheatService)
    {
        $this->authorize('create', Visit::class);

        $user = $request->user();

        $validatedData = $request->validate([
            'place_id' => 'required|exists:places,id',
            'sport_id' => 'required|exists:sports,id',
            'is_combination' => 'required|boolean',
            'timestamp' => 'required|date',
        ]);

        $antiCheatResult = $antiCheatService->checkNewVisit($validatedData, $user);
        $validatedData['user_id'] = $user->id;

        $cheatNote = null;

        if ($antiCheatResult->isCheating) {
            if($antiCheatResult->solution === "not_save") {

                return response()->error($antiCheatResult->cheatMessage, 400);

            } elseif ($antiCheatResult->solution === "not_combination") {

                $cheatNote = $antiCheatResult->cheatMessage;
                $validatedData['is_combination'] = false;
            }
        }

        $defaultReward = Place::findOrFail($validatedData['place_id'])->default_reward;

        if($validatedData['is_combination'] === true) {

            $visitSport = Sport::findOrFail($validatedData['sport_id']);
            $lastVisit = $user->visitsCombinations()->last();
            $lastVisitComb = $lastVisit->combination_order;
            $combMultLevel = min($lastVisitComb + 1, 4);
            $combMultField = 'comb_mult_' . $combMultLevel;
            $combMult = $visitSport->{$combMultField};
            $visitCoords = Place::findOrFail($validatedData['place_id'])->coordinates;
            $lastVisitCoords = $lastVisit->place->coordinates;
            $distanceInMeters = DB::query()
                ->select(ST::distanceSphere($visitCoords, $lastVisitCoords)->as('distance'))
                ->first()
                ->distance;
            $distanceInKilometers = $distanceInMeters / 1000;
            $pointsPerKilometer = config('general.pointsPerKilometer');

            $reward = floor(($defaultReward + ($distanceInKilometers * $pointsPerKilometer)) * $combMult);

        } else {
            $reward = $defaultReward;
        }

        $validatedData['reward'] = $reward;

        $visit = Visit::create($validatedData);

        if($cheatNote) {
            Cheat::create([
                'visit_id' => $visit->id,
                'visit_id_2' => $user->visitsCombinations()->last()->id,
                'user_message' => null,
                'is_denied' => false,
                'cheat_description' => $cheatNote,
            ]);
        }

        return response()->success([
            'id' => $visit->id,
            'place_id' => $visit->place_id,
            'sport_id' => $visit->sport_id,
            'user_id' => $visit->user_id,
            'reward' => $visit->reward,
            'is_combination' => $visit->is_combination,
            'timestamp' => $visit->timestamp,
            'cheat_note' => $cheatNote,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Visit $visit)
    {
        $this->authorize('view', $visit);

        $visit->load(['user', 'place', 'sport']);

        return response()->success([
            'id' => $visit->id,
            'place_id' => $visit->place_id,
            'sport_id' => $visit->sport_id,
            'user_id' => $visit->user_id,
            'place' => $visit->place,
            'sport' => $visit->sport,
            'user' => $visit->user,
            'reward' => $visit->reward,
            'is_combination' => $visit->is_combination,
            'timestamp' => $visit->timestamp,
        ]);
    }

}
