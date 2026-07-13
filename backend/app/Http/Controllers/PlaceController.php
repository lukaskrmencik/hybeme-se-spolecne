<?php

namespace App\Http\Controllers;

use App\Models\Place;
use App\Services\ImageModerationService;
use Clickbar\Magellan\Data\Geometries\Point;
use Clickbar\Magellan\IO\Parser\Geojson\GeojsonParser;
use Clickbar\Magellan\Rules\GeometryGeojsonRule;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PlaceController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Place::class);

        $perPage = (int) $request->input('per_page', config('pagination.per_page_default'));
        if (
            $perPage < config('pagination.per_page_min') ||
            $perPage > config('pagination.per_page_max')
        ){
            $perPage = config('pagination.per_page_default');
        }

        $onlyActive = (bool) $request->input('only_active', true);

        $query = Place::query();

        if ($onlyActive) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $searchTerm = $request->input('search');

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', '%' . $searchTerm . '%');
            });
        }

        $places = $query->paginate($perPage);

        return response()->pagination($places);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Place::class);

        $validatedData = $request->validate([
            'name' => 'required|string|unique:places,name|max:255',
            'coordinates' => ['required', new GeometryGeojsonRule([Point::class])],
            'default_reward' => 'required|integer|min:0',
        ]);

        $parser = app(GeojsonParser::class);
        $validatedData['coordinates'] = $parser->parse($request->input('coordinates'));

        $place = Place::create($validatedData);

        return response()->success([
            'id' => $place->id,
            'name' => $place->name,
            'coordinates' => $place->coordinates,
            'image_url' => $place->image_url,
            'default_reward' => $place->default_reward,
            'is_active' => $place->is_active,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Place $place)
    {
        $this->authorize('view', $place);

        return response()->success([
            'id' => $place->id,
            'name' => $place->name,
            'coordinates' => $place->coordinates,
            'image_url' => $place->image_url,
            'default_reward' => $place->default_reward,
            'is_active' => $place->is_active,
            'latest_visits' => $place->latestVisits(),
            'photos' => $place->photos,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Place $place)
    {
        $this->authorize('update', $place);

        $validatedData = $request->validate([
            'name' => [
                'sometimes','required','string','max:255',
                Rule::unique('places', 'name')->ignore($place->id),
            ],
            'coordinates' => ['sometimes', new GeometryGeojsonRule([Point::class])],
            'default_reward' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        

        $parser = app(GeojsonParser::class);
        $validatedData['coordinates'] = $parser->parse($request->input('coordinates'));

        $place->update($validatedData);

        return response()->success([
            'id' => $place->id,
            'name' => $place->name,
            'coordinates' => $place->coordinates,
            'image_url' => $place->image_url,
            'default_reward' => $place->default_reward,
            'is_active' => $place->is_active,
        ]);
    }

    public function uploadImage(Request $request, Place $place, ImageModerationService $imageModerationService)
    {
        $this->authorize('update', $place);

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $file = $request->file('image');

        if (!$imageModerationService->isSafe($file)) {
            return response()->error('Fotka nesplňuje podmínky aplikace.', 422);
        }

        if ($place->image_url) {
            $oldPath = str_replace(url('storage/'), '', $place->image_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $filename = uniqid() . '.' . $file->getClientOriginalExtension();

        Storage::disk('public')->putFileAs('place_images', $file, $filename);

        $path = 'place_images/' . $filename;

        $publicUrl = url('storage/' . $path);

        $place->update([
            'image_url' => $publicUrl
        ]);

        return response()->success([
            'image_url' => $publicUrl
        ]);
    }
}
