<?php

namespace App\Http\Controllers;

use App\Models\Sport;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class SportController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Sport::class);

        $onlyActive = (bool) $request->input('only_active', true);

        $query = Sport::query();

        if ($onlyActive) {
            $query->where('is_active', true);
        }

        $sports = $query->get();

        return response()->success($sports);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Sport::class);

        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:sports,name',
            'average_speed' => 'required|numeric|min:0',
            'max_speed' => 'required|numeric|min:0',
            'min_speed' => 'required|numeric|min:0',
            'comb_mult_1' => 'required|numeric|min:0',
            'comb_mult_2' => 'required|numeric|min:0',
            'comb_mult_3' => 'required|numeric|min:0',
            'comb_mult_4' => 'required|numeric|min:0',
        ]);

        $validatedData['icon_url'] = config('general.default_sport_icon_url');

        $sport = Sport::create($validatedData);

        return response()->success([
            'id' => $sport->id,
            'name' => $sport->name,
            'icon_url' => $sport->icon_url,
            'average_speed' => $sport->average_speed,
            'max_speed' => $sport->max_speed,
            'min_speed' => $sport->min_speed,
            'comb_mult_1' => $sport->comb_mult_1,
            'comb_mult_2' => $sport->comb_mult_2,
            'comb_mult_3' => $sport->comb_mult_3,
            'comb_mult_4' => $sport->comb_mult_4,
            'is_active' => $sport->is_active,
        ], 201);
    }


    /**
     * Display the specified resource.
     */
    public function show(Sport $sport)
    {
        $this->authorize('view', $sport);

        return response()->success([
            'id' => $sport->id,
            'name' => $sport->name,
            'icon_url' => $sport->icon_url,
            'average_speed' => $sport->average_speed,
            'max_speed' => $sport->max_speed,
            'min_speed' => $sport->min_speed,
            'comb_mult_1' => $sport->comb_mult_1,
            'comb_mult_2' => $sport->comb_mult_2,
            'comb_mult_3' => $sport->comb_mult_3,
            'comb_mult_4' => $sport->comb_mult_4,
            'is_active' => $sport->is_active,
        ]);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Sport $sport)
    {
        $this->authorize('update', $sport);

        $validatedData = $request->validate([
            'name' => [
                'sometimes','required','string','max:255',
                Rule::unique('sports', 'name')->ignore($sport->id),
            ],
            'average_speed' => 'sometimes|required|numeric|min:0',
            'max_speed' => 'sometimes|required|numeric|min:0',
            'min_speed' => 'sometimes|required|numeric|min:0',
            'comb_mult_1' => 'sometimes|required|numeric|min:0',
            'comb_mult_2' => 'sometimes|required|numeric|min:0',
            'comb_mult_3' => 'sometimes|required|numeric|min:0',
            'comb_mult_4' => 'sometimes|required|numeric|min:0',
            'is_active' => 'sometimes|required|boolean',
        ]);

        $sport->update($validatedData);

        return response()->success([
            'id' => $sport->id,
            'name' => $sport->name,
            'icon_url' => $sport->icon_url,
            'average_speed' => $sport->average_speed,
            'max_speed' => $sport->max_speed,
            'min_speed' => $sport->min_speed,
            'comb_mult_1' => $sport->comb_mult_1,
            'comb_mult_2' => $sport->comb_mult_2,
            'comb_mult_3' => $sport->comb_mult_3,
            'comb_mult_4' => $sport->comb_mult_4,
            'is_active' => $sport->is_active,
        ]);
    }

    public function uploadIcon(Request $request, Sport $sport)
    {
        $this->authorize('update', $sport);

        $request->validate([
            'icon' => 'required|file|mimes:svg|max:512',
        ]);

        if ($sport->icon_url && $sport->icon_url !== config('general.default_sport_icon_url')) {
            $oldPath = str_replace(url('storage/'), '', $sport->icon_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $path = $request->file('icon')->store('sport_icons', 'public');

        $publicUrl = url('storage/' . $path);

        $sport->update([
            'icon_url' => $publicUrl
        ]);

        return response()->success([
            'icon_url' => $publicUrl
        ]);
    }
}
