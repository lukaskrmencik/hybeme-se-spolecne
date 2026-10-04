<?php

namespace App\Http\Controllers;

use App\Mail\ReportMail;
use App\Models\Report;
use App\Models\User;
use App\Models\VisitsPhoto;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    use AuthorizesRequests;

    /**
     * A user reports a visit photo, a profile photo or a name. The admins get one e-mail per reported
     * thing (not per report), and the same user cannot report the same thing twice while it is open.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Report::class);

        $data = $request->validate([
            'type' => ['required', Rule::in(Report::TYPES)],
            'photo_id' => ['required_if:type,visit_photo', 'nullable', 'integer'],
            'user_id' => ['required_unless:type,visit_photo', 'nullable', 'integer'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $reporter = $request->user();
        $photoId = null;

        if ($data['type'] === 'visit_photo') {
            $photo = VisitsPhoto::with('visit')->find($data['photo_id']);
            if (!$photo || !$photo->visit) {
                return response()->error('Fotografie už neexistuje.', 404);
            }
            $reported = User::find($photo->visit->user_id);
            $photoId = $photo->id;
            $contentUrl = $photo->photo_url;
            $contentText = null;
        } else {
            $reported = User::find($data['user_id']);
            if (!$reported) {
                return response()->error('Uživatel už neexistuje.', 404);
            }
            if ($data['type'] === 'avatar' && !$reported->avatar_url) {
                return response()->error('Uživatel nemá profilovou fotku.', 422);
            }
            $contentUrl = $data['type'] === 'avatar' ? $reported->avatar_url : null;
            $contentText = $reported->name;
        }

        if (!$reported) {
            return response()->error('Uživatel už neexistuje.', 404);
        }
        if ($reported->id === $reporter->id) {
            return response()->error('Vlastní obsah nahlásit nelze.', 422);
        }

        $sameTarget = Report::open()->sameTarget($data['type'], $reported->id, $photoId);

        if ((clone $sameTarget)->where('reporter_id', $reporter->id)->exists()) {
            return response()->success(['already_reported' => true]);
        }
        $firstReport = !(clone $sameTarget)->exists();

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'type' => $data['type'],
            'reported_user_id' => $reported->id,
            'visits_photo_id' => $photoId,
            'content_url' => $contentUrl,
            'content_text' => $contentText,
            'note' => $data['note'] ?? null,
        ]);

        if ($firstReport) {
            $this->notifyAdmins($report->load(['reporter', 'reportedUser', 'photo.visit.place']));
        }

        return response()->success(['id' => $report->id], 201);
    }

    /**
     * Admin list. status=open (default) or resolved. Each item carries open_count, the number of open
     * reports about the same thing, so the admin handles them at once.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Report::class);

        $status = $request->input('status') === 'resolved' ? 'resolved' : 'open';

        $reports = Report::query()
            ->where('status', $status)
            ->with([
                'reporter:id,name,email',
                'reportedUser:id,name,email,avatar_url,role',
                'photo.visit:id,place_id,timestamp',
                'photo.visit.place:id,name',
            ])
            ->orderBy($status === 'open' ? 'created_at' : 'resolved_at', $status === 'open' ? 'asc' : 'desc')
            ->paginate(50);

        $counts = Report::open()
            ->selectRaw('type, reported_user_id, visits_photo_id, count(*) as total')
            ->groupBy('type', 'reported_user_id', 'visits_photo_id')
            ->get()
            ->mapWithKeys(fn ($r) => ["{$r->type}:{$r->reported_user_id}:{$r->visits_photo_id}" => (int) $r->total]);

        $reports->getCollection()->transform(function (Report $report) use ($counts) {
            $report->open_count = $counts["{$report->type}:{$report->reported_user_id}:{$report->visits_photo_id}"] ?? 0;
            return $report;
        });

        return response()->pagination($reports);
    }

    /** Admin: closes the report and every other open report about the same thing. */
    public function resolve(Request $request, Report $report)
    {
        $this->authorize('update', $report);

        $data = $request->validate([
            'resolution' => ['required', Rule::in(Report::RESOLUTIONS)],
        ]);

        $closed = Report::open()
            ->sameTarget($report->type, $report->reported_user_id, $report->visits_photo_id)
            ->update([
                'status' => 'resolved',
                'resolution' => $data['resolution'],
                'resolved_by' => $request->user()->id,
                'resolved_at' => now(),
            ]);

        return response()->success(['resolved' => $closed]);
    }

    private function notifyAdmins(Report $report): void
    {
        $admins = User::where('role', 'admin')->whereNotNull('email')->pluck('email');

        foreach ($admins as $email) {
            try {
                Mail::to($email)->send(new ReportMail($report));
            } catch (\Throwable $e) {
                // The report is saved either way and waits in the administration.
                report($e);
            }
        }
    }
}
