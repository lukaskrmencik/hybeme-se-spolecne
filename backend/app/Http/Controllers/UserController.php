<?php

namespace App\Http\Controllers;

use App\Models\Cheat;
use App\Models\User;
use App\Models\Visit;
use App\Models\VisitsPhoto;
use App\Services\AvatarImage;
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

    public function show(User $user)
    {
        $this->authorize('view', $user);

        return response()->success([
            'id' => $user->id,
            'role' => $user->role,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_url,
            'terms_accepted_at' => $user->terms_accepted_at,
            'terms_version' => $user->terms_version,
            'visitsCombinations' => $user->visitsCombinations(),
            'totalPoints' => $user->totalPoints(),
            'cheats' => $user->cheats()->where('is_denied', false)->get(),
        ]);
    }

    public function profile(Request $request, User $user)
    {
        $this->authorize('viewProfile', $user);

        $own = $request->user()->id === $user->id;
        $visibleBefore = now()->subHours(config('general.publicVisitDelayHours', 24));

        $visits = $user->visitsCombinations()
            ->filter(fn (Visit $v) => $own || $v->timestamp->lt($visibleBefore))
            ->sortByDesc('timestamp')
            ->values()
            ->map(fn (Visit $v) => [
                'id' => $v->id,
                'place_id' => $v->place_id,
                'sport_id' => $v->sport_id,
                'reward' => $v->reward,
                'is_combination' => $v->is_combination,
                'combination_order' => $v->combination_order,
                'date' => $v->timestamp->copy()->setTimezone('Europe/Prague')->toDateString(),
                'place' => $v->place ? [
                    'id' => $v->place->id,
                    'name' => $v->place->name,
                    'coordinates' => $v->place->coordinates,
                ] : null,
                'sport' => $v->sport ? ['id' => $v->sport->id, 'name' => $v->sport->name] : null,
                'photos' => $v->photos->map(fn ($p) => ['id' => $p->id, 'photo_url' => $p->photo_url])->values(),
            ]);

        return response()->success([
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'total_points' => $user->totalPoints(),
            'visits_count' => $user->visits->count(),
            'hidden_recent' => !$own && $user->visits->contains(fn (Visit $v) => $v->timestamp->gte($visibleBefore)),
            'visits' => $visits,
        ]);
    }

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

    public function acceptTerms(Request $request, User $user)
    {
        abort_unless($request->user()->id === $user->id, 403);

        $request->validate([
            'version' => ['required', 'string', Rule::in([config('general.termsVersion')])],
        ], [
            'version.in' => 'Podmínky se mezitím změnily. Načti prosím aplikaci znovu.',
        ]);

        $user->forceFill([
            'terms_accepted_at' => now(),
            'terms_version' => config('general.termsVersion'),
        ])->save();

        return response()->success([
            'terms_accepted_at' => $user->terms_accepted_at,
            'terms_version' => $user->terms_version,
        ]);
    }

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
        AvatarImage::shrink(Storage::disk('public')->path($path));

        $publicUrl = url('storage/' . $path);

        $user->update([
            'avatar_url' => $publicUrl
        ]);

        return response()->success([
            'avatar_url' => $publicUrl
        ]);
    }

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
            }
        }

        return response()->success([
            'message' => 'Uživatel a všechna jeho data byla úspěšně smazána.'
        ]);
    }

    private const LEADERBOARD_TZ = 'Europe/Prague';

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
