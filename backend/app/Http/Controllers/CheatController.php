<?php

namespace App\Http\Controllers;

use App\Mail\CheatDenyRequest;
use App\Models\Cheat;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class CheatController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Cheat::class);

        $perPage = (int) $request->input('per_page', config('pagination.per_page_default'));
        if (
            $perPage < config('pagination.per_page_min') ||
            $perPage > config('pagination.per_page_max')
        ) {
            $perPage = config('pagination.per_page_default');
        }

        $query = Cheat::query()->with(['visit.user', 'visit.place', 'visit.sport', 'visit2.user', 'visit2.place', 'visit2.sport']);

        $query->where('is_denied', false);

        if ($request->filled('search')) {
            $searchTerm = $request->input('search');

            $query->where(function ($q) use ($searchTerm) {
                $q->where('user_message', 'ILIKE', '%' . $searchTerm . '%')
                ->orWhere('cheat_description', 'ILIKE', '%' . $searchTerm . '%')
                ->orWhereHas('visit.user', function ($userQuery) use ($searchTerm) {
                    $userQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('visit.place', function ($placeQuery) use ($searchTerm) {
                    $placeQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('visit.sport', function ($sportQuery) use ($searchTerm) {
                    $sportQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('visit2.user', function ($userQuery) use ($searchTerm) {
                    $userQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('visit2.place', function ($placeQuery) use ($searchTerm) {
                    $placeQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                })
                ->orWhereHas('visit2.sport', function ($sportQuery) use ($searchTerm) {
                    $sportQuery->where('name', 'ILIKE', '%' . $searchTerm . '%');
                });
            });
        }

        $cheats = $query->paginate($perPage);

        return response()->pagination($cheats);
    }

    /**
     * Display the specified resource.
     */
    public function show(Cheat $cheat)
    {
        $this->authorize('view', $cheat);

        $cheat->load([
            'visit.user',  
            'visit.place',
            'visit.sport',
            'visit2.user',
            'visit2.place',
            'visit2.sport'
        ]);

        return response()->success($cheat);
    }

    /**
     * Deny the specified cheat.
     */
    public function denyCheat(Request $request, Cheat $cheat)
    {
        $this->authorize('deny', $cheat);

        if ($cheat->is_denied !== true) {

            $visit = $cheat->visit;
            $user = $visit->user;
            $visitCombinations = $user->visitsCombinations();
            $visit->update(['is_combination' => true]);

            $afterCheatVisit = false;

            for($i = 0; $i < count($visitCombinations); $i++) {
                $visitCombination = $visitCombinations[$i];
                $actualVisit = Visit::findOrFail($visitCombination->id);

                if($visitCombination->id === $visit->id) {
                    $afterCheatVisit = true;
                }

                if($afterCheatVisit) {

                    if($actualVisit->is_combination === false) {
                        break;
                    }else{
                        $placeId = $actualVisit->place_id;
                        $sportId = $actualVisit->sport_id;
                        $defaultReward = $actualVisit->place->default_reward;
                        $lastVisit = $visitCombinations[$i-1];

                        $reward = calc_combination_reward($user, $sportId, $placeId, $defaultReward, $lastVisit);

                        $actualVisit->update(['reward' => $reward]);
                    }
                }
            }

            $cheat->update(['is_denied' => true]);

        }else{
            return response()->error('Podvod již byl zamítnut', 400);
        }

        return response()->success($cheat);
    }

    public function messageAdmin(Request $request, Cheat $cheat)
    {
        $this->authorize('messageAdmin', $cheat);

        if($cheat->user_message !== null) {
            return response()->error('Uživatel již poslal zprávu administrátorovi', 400);
        }

        $validatedData = $request->validate([
            'user_message' => 'required|string|max:1000',
        ]);

        $cheat->update(['user_message' => $validatedData['user_message']]);

        $admins = User::where('role', 'admin')->get();

        foreach ($admins as $admin) {
            Mail::to($admin->email)->send(new CheatDenyRequest(
                adminName: $admin->name,
                userName: $cheat->visit->user->name,
                userMessage: $validatedData['user_message'],
            ));
        }

        return response()->success($cheat);
    }
}
