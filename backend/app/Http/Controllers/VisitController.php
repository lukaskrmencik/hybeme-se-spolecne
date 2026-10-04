<?php

namespace App\Http\Controllers;

use App\Models\Cheat;
use App\Models\Place;
use App\Models\Visit;
use App\Models\VisitsPhoto;
use App\Services\AntiCheatService;
use App\Services\ImageModerationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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

        $query = Visit::query()->with(['user', 'place', 'sport', 'photos']);

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
            'place_id' => ['required', 'integer', Rule::exists('places', 'id')->where('is_active', true)],
            'sport_id' => ['required', 'integer', Rule::exists('sports', 'id')->where('is_active', true)],
            'is_combination' => 'required|boolean',
            'timestamp' => 'required|date',
        ]);

        $validatedData['is_combination'] = $request->boolean('is_combination');

        if (Carbon::parse($validatedData['timestamp'])->isAfter(now()->addMinutes(10))) {
            return response()->error('Čas návštěvy nemůže být v budoucnosti.', 400);
        }

        $lastVisit = $user->visitsCombinations()->last();

        if ($validatedData['is_combination'] === true && !$lastVisit) {
            $validatedData['is_combination'] = false;
        }

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

            $reward = calc_combination_reward($user, $validatedData['sport_id'], $validatedData['place_id'], $defaultReward, $lastVisit);

        } else {
            $reward = $defaultReward;
        }

        $validatedData['reward'] = $reward;

        $visit = Visit::create($validatedData);

        if($cheatNote) {
            Cheat::create([
                'visit_id' => $visit->id,
                'visit_id_2' => $lastVisit->id,
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

        $visit->load(['user', 'place', 'sport', 'photos']);

        return response()->success([
            'id' => $visit->id,
            'place_id' => $visit->place_id,
            'sport_id' => $visit->sport_id,
            'user_id' => $visit->user_id,
            'place' => $visit->place,
            'sport' => $visit->sport,
            'photos' => $visit->photos,
            'user' => $visit->user,
            'reward' => $visit->reward,
            'is_combination' => $visit->is_combination,
            'timestamp' => $visit->timestamp,
        ]);
    }

    /**
     * All visit photos for the admin, newest first. Filters: search (author name or e-mail),
     * user_id, place_id, from / to (upload date, Y-m-d).
     */
    public function photos(Request $request)
    {
        $this->authorize('viewAny', Visit::class);

        $validated = $request->validate([
            'search' => 'sometimes|nullable|string|max:255',
            'user_id' => 'sometimes|nullable|integer',
            'place_id' => 'sometimes|nullable|integer',
            'from' => 'sometimes|nullable|date',
            'to' => 'sometimes|nullable|date',
        ]);

        $perPage = (int) $request->input('per_page', config('pagination.per_page_default'));
        if ($perPage < config('pagination.per_page_min') || $perPage > config('pagination.per_page_max')) {
            $perPage = config('pagination.per_page_default');
        }

        $query = VisitsPhoto::query()
            ->with(['visit:id,user_id,place_id,timestamp', 'visit.user:id,name,email', 'visit.place:id,name'])
            ->orderByDesc('id');

        if (!empty($validated['search'])) {
            $term = '%' . $validated['search'] . '%';
            $query->whereHas('visit.user', function ($q) use ($term) {
                $q->where('name', 'ILIKE', $term)->orWhere('email', 'ILIKE', $term);
            });
        }
        if (!empty($validated['user_id'])) {
            $query->whereHas('visit', fn ($q) => $q->where('user_id', $validated['user_id']));
        }
        if (!empty($validated['place_id'])) {
            $query->whereHas('visit', fn ($q) => $q->where('place_id', $validated['place_id']));
        }
        if (!empty($validated['from'])) {
            $query->whereDate('created_at', '>=', $validated['from']);
        }
        if (!empty($validated['to'])) {
            $query->whereDate('created_at', '<=', $validated['to']);
        }

        return response()->pagination($query->paginate($perPage));
    }

    public function uploadPhoto(Request $request, Visit $visit, ImageModerationService $imageModerationService)
    {
        $this->authorize('uploadPhoto', $visit);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $file = $request->file('photo');

        if (!$imageModerationService->isSafe($file)) {
            return response()->error('Fotka nesplňuje podmínky aplikace.', 422);
        }

        $filename = uniqid() . '.' . $file->getClientOriginalExtension();

        Storage::disk('public')->putFileAs('visits_photos', $file, $filename);

        $path = 'visits_photos/' . $filename;

        $publicUrl = url('storage/' . $path);

        $visitsPhoto = VisitsPhoto::create([
            'visit_id' => $visit->id,
            'photo_url' => $publicUrl,
        ]);

        return response()->success([
            'id' => $visitsPhoto->id,
            'visit_id' => $visitsPhoto->visit_id,
            'photo_url' => $visitsPhoto->photo_url,
        ], 201);
    }

    public function deletePhoto(Request $request, VisitsPhoto $visitsPhoto){

        $this->authorize('deletePhoto', $visitsPhoto->visit);

        $path = str_replace(url('storage/'), '', $visitsPhoto->photo_url);
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $visitsPhoto->delete();

        return response()->success([
            'message' => 'Fotka byla úspěšně smazána.',
        ], 200);
    }
}
