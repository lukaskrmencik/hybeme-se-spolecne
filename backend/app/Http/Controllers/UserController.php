<?php

namespace App\Http\Controllers;

use App\Models\Cheat;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitsPhoto;
use App\Services\ImageModerationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
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

        // Newest first, with a short summary of the activity for the admin list.
        $query = User::query()
            ->withCount('visits')
            ->withSum('visits as total_points', 'reward')
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $searchTerm = $request->input('search');

            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', '%' . $searchTerm . '%')
                ->orWhere('email', 'ILIKE', '%' . $searchTerm . '%');
            });
        }

        if (in_array($request->input('role'), ['user', 'admin'], true)) {
            $query->where('role', $request->input('role'));
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
            'visitsCombinations' => $user->visitsCombinations(),
            'totalPoints' => $user->totalPoints(),
            'cheats' => $user->cheats()->where('is_denied', false)->get(),
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

    /** Admin: makes a user an admin, or back an ordinary user. */
    public function updateRole(Request $request, User $user)
    {
        $this->authorize('changeRole', $user);

        $validatedData = $request->validate([
            'role' => ['required', Rule::in(['user', 'admin'])],
        ]);

        $user->role = $validatedData['role'];
        $user->save();

        return response()->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
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

        $visitIds = $user->visits()->pluck('id');
        $photos = VisitsPhoto::whereIn('visit_id', $visitIds)->get();
        $filesToDelete = $photos->pluck('photo_url')->push($user->avatar_url)->filter();

        DB::transaction(function () use ($user, $visitIds) {
            Cheat::whereIn('visit_id', $visitIds)
                ->orWhereIn('visit_id_2', $visitIds)
                ->delete();
            VisitsPhoto::whereIn('visit_id', $visitIds)->delete();
            Visit::whereIn('id', $visitIds)->delete();
            $user->delete();
        });

        foreach ($filesToDelete as $url) {
            $path = str_replace(url('storage/'), '', $url);
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

        return response()->success([
            'message' => 'Uživatel a všechna jeho data byla úspěšně smazána.'
        ]);
    }

    public function leaderboard(Request $request)
    {
        $leaderboardMaxUsers = config('general.leaderboardMaxUsers', 20);

        $subquery = User::query()
            ->select('users.id', 'users.name', 'users.avatar_url')
            ->selectRaw('COALESCE(SUM(visits.reward), 0) as total_points')
            ->selectRaw('ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(visits.reward), 0) DESC) as rank')
            ->leftJoin('visits', 'users.id', '=', 'visits.user_id')
            ->groupBy('users.id', 'users.name', 'users.avatar_url');

        $allUsers = DB::table(DB::raw("({$subquery->toSql()}) as leaderboard"))
            ->mergeBindings($subquery->getQuery())
            ->get();

        $topUsers = $allUsers->take($leaderboardMaxUsers);

        $currentUser = null;
        $authUserId = auth('api')->id();

        if ($authUserId) {
            $currentUser = $allUsers->firstWhere('id', $authUserId);
        }

        return response()->json([
            'success' => true,
            'leaderboard' => $topUsers,
            'current_user' => $currentUser,
            'total_users' => $allUsers->count(),
        ]);
    }
}
