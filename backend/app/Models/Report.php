<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A user's report of inappropriate content: a visit photo, a profile photo or a name.
 */
class Report extends Model
{
    public const TYPES = ['visit_photo', 'avatar', 'name'];
    public const RESOLUTIONS = ['removed_photo', 'removed_avatar', 'renamed', 'deleted_user', 'dismissed'];

    protected $fillable = [
        'reporter_id',
        'type',
        'reported_user_id',
        'visits_photo_id',
        'content_url',
        'content_text',
        'note',
        'status',
        'resolution',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'id' => 'integer',
            'reporter_id' => 'integer',
            'reported_user_id' => 'integer',
            'visits_photo_id' => 'integer',
            'resolved_by' => 'integer',
            'resolved_at' => 'datetime',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reportedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function photo(): BelongsTo
    {
        return $this->belongsTo(VisitsPhoto::class, 'visits_photo_id');
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', 'open');
    }

    /** Reports about the same thing: the same photo, or the same user's avatar / name. */
    public function scopeSameTarget(Builder $query, string $type, int $userId, ?int $photoId): Builder
    {
        return $query->where('type', $type)
            ->where('reported_user_id', $userId)
            ->when($photoId, fn ($q) => $q->where('visits_photo_id', $photoId), fn ($q) => $q->whereNull('visits_photo_id'));
    }
}
