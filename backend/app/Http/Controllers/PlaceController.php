<?php

namespace App\Http\Controllers;

use App\Models\Place;
use App\Models\PlacePhoto;
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

        $onlyActive = $request->boolean('only_active', true);

        $query = Place::query()->withCount('adminPhotos');

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
            'admin_photos' => $place->adminPhotos,
        ]);
    }

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

        if ($request->has('coordinates')) {
            $parser = app(GeojsonParser::class);
            $validatedData['coordinates'] = $parser->parse($request->input('coordinates'));
        }

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

    public function uploadAdminPhoto(Request $request, Place $place)
    {
        $this->authorize('update', $place);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $file = $request->file('photo');
        $filename = uniqid() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->putFileAs('place_photos', $file, $filename);

        $photo = PlacePhoto::create([
            'place_id' => $place->id,
            'photo_url' => url('storage/place_photos/' . $filename),
        ]);

        return response()->success($photo, 201);
    }

    public function deleteAdminPhoto(PlacePhoto $placePhoto)
    {
        $this->authorize('update', $placePhoto->place);

        $path = str_replace(url('storage/'), '', $placePhoto->photo_url);
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
        $placePhoto->delete();

        return response()->success(['message' => 'Fotka byla smazána.']);
    }
}
