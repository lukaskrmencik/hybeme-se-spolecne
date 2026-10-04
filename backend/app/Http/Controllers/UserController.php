<?php

namespace App\Http\Controllers;

use App\Models\Cheat;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitsPhoto;
use App\Services\ImageModerationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

    /** Removes the profile photo (the user themselves, or an admin after a report). */
    public function deleteAvatar(User $user)
    {
        $this->authorize('update', $user);

        if ($user->avatar_url) {
            $path = str_replace(url('storage/'), '', $user->avatar_url);
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
            $user->update(['avatar_url' => null]);
        }

        return response()->success(['avatar_url' => null]);
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

    /** Weeks run Monday to Sunday in Czech time. */
    private const LEADERBOARD_TZ = 'Europe/Prague';

    /**
     * Leaderboard of everybody (default) or of the current week (?period=week).
     * Only users with points are ranked; equal points share a place (1, 1, 3).
     */
    public function leaderboard(Request $request)
    {
        $leaderboardMaxUsers = config('general.leaderboardMaxUsers', 20);
        $week = $request->input('period') === 'week';

        $from = $week ? now(self::LEADERBOARD_TZ)->startOfWeek(Carbon::MONDAY) : null;
        $to = $from?->copy()->addWeek();

        $ranked = $this->rankedUsers($from, $to);
        $authUserId = auth('api')->id();

        return response()->json([
            'success' => true,
            'period' => $week ? 'week' : 'all',
            'week_start' => $from?->toDateString(),
            'week_end' => $to?->copy()->subDay()->toDateString(),
            'leaderboard' => $ranked->filter(fn ($u) => $u->rank <= $leaderboardMaxUsers)->values(),
            'current_user' => $authUserId ? $ranked->firstWhere('id', $authUserId) : null,
            'total_users' => $ranked->count(),
        ]);
    }

    /** Finished weeks, newest first, each with its top three places (more people when they share one). */
    public function leaderboardWeeks()
    {
        $currentWeekStart = now(self::LEADERBOARD_TZ)->startOfWeek(Carbon::MONDAY)->toDateString();

        $rows = DB::select("
            with weekly as (
                select date_trunc('week', v.timestamp at time zone ?)::date as week_start,
                       v.user_id,
                       sum(v.reward)::int as points
                from visits v
                group by 1, 2
                having sum(v.reward) > 0
            ), ranked as (
                select w.*, rank() over (partition by w.week_start order by w.points desc)::int as rank
                from weekly w
            )
            select r.week_start, r.rank, r.points, u.id, u.name, u.avatar_url
            from ranked r
            join users u on u.id = r.user_id
            where r.rank <= 3 and r.week_start < ?::date
            order by r.week_start desc, r.rank, u.name
        ", [self::LEADERBOARD_TZ, $currentWeekStart]);

        $weeks = collect($rows)
            ->groupBy(fn ($row) => (string) $row->week_start)
            ->take(52)
            ->map(fn ($podium, $weekStart) => [
                'week_start' => $weekStart,
                'week_end' => Carbon::parse($weekStart)->addDays(6)->toDateString(),
                'podium' => $podium->map(fn ($row) => [
                    'id' => $row->id,
                    'name' => $row->name,
                    'avatar_url' => $row->avatar_url,
                    'points' => $row->points,
                    'rank' => $row->rank,
                ])->values(),
            ])
            ->values();

        return response()->json(['success' => true, 'weeks' => $weeks]);
    }

    /** Users with points in the period (or ever), with a shared place for equal points. */
    private function rankedUsers(?Carbon $from, ?Carbon $to): \Illuminate\Support\Collection
    {
        $where = '';
        $bindings = [];
        if ($from && $to) {
            $where = 'where v.timestamp >= ? and v.timestamp < ?';
            $bindings = [$from->toIso8601String(), $to->toIso8601String()];
        }

        return collect(DB::select("
            select u.id, u.name, u.avatar_url,
                   sum(v.reward)::int as total_points,
                   rank() over (order by sum(v.reward) desc)::int as rank
            from users u
            join visits v on v.user_id = u.id
            {$where}
            group by u.id, u.name, u.avatar_url
            having sum(v.reward) > 0
            order by rank, u.name
        ", $bindings));
    }
}
