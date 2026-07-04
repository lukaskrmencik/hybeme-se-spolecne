<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ImageModerationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class UserController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $perPage = (int) $request->input('per_page', config('pagination.per_page_default'));
        if (
            $perPage < config('pagination.per_page_min') ||
            $perPage > config('pagination.per_page_max')
        ){
            $perPage = config('pagination.per_page_default');
        }

        $query = User::query();

        if ($request->filled('search')) {
            $searchTerm = $request->input('search');

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'LIKE', '%' . $searchTerm . '%')
                ->orWhere('email', 'LIKE', '%' . $searchTerm . '%');
            });
        }

        $users = $query->paginate($perPage);

        return response()->pagination($users);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        $this->authorize('view', $user);

        return response()->success([
            'id' => $user->id,
            'role' => $user->role,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_url,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
        ]);

        $dataToUpdate = $request->only(['name']);

        $user->update($dataToUpdate);

        return response()->success([
            'id' => $user->id,
            'role' => $user->role,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_url,
        ]);
    }

    public function uploadAvatar(Request $request, User $user, ImageModerationService $imageModerationService)
    {
        $this->authorize('update', $user);

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $file = $request->file('avatar');

        if (!$imageModerationService->isSafe($file)) {
            return response()->error('Fotka nesplňuje podmínky aplikace.', 422);
        }

        if ($user->avatar_url) {
            $oldPath = str_replace(url('storage/'), '', $user->avatar_url);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $filename = uniqid() . '.' . $file->getClientOriginalExtension();

        Storage::disk('public')->putFileAs('avatars', $file, $filename);

        $path = 'avatars/' . $filename;

        $publicUrl = url('storage/' . $path);

        $user->update([
            'avatar_url' => $publicUrl
        ]);

        return response()->success([
            'avatar_url' => $publicUrl
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        if ($user->avatar_url) {
            $path = str_replace(url('storage/'), '', $user->avatar_url);
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }

        if (auth()->user()->id === $user->id) {
            try {
                JWTAuth::invalidate(JWTAuth::getToken());
            } catch (\Exception $e) {
                //
            }
        }

        $user->delete();

        return response()->success([
            'message' => 'Uživatel a všechna jeho data byla úspěšně smazána.'
        ]);
    }
}
