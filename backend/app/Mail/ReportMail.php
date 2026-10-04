<?php

namespace App\Mail;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Tells the admins that something was reported, with a link straight to the administration. */
class ReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public const LABELS = [
        'visit_photo' => 'Nevhodná fotografie u místa',
        'avatar' => 'Nevhodná profilová fotka',
        'name' => 'Nevhodné jméno',
    ];

    public function __construct(public Report $report) {}

    public function envelope(): Envelope
    {
        $label = self::LABELS[$this->report->type] ?? 'Nahlášený obsah';
        $who = $this->report->reportedUser?->name ?? 'uživatel';

        return new Envelope(subject: "Nahlášení: {$label} – {$who}");
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.report',
            text: 'emails.report-text',
            with: [
                'label' => self::LABELS[$this->report->type] ?? 'Nahlášený obsah',
                'adminUrl' => rtrim((string) config('services.frontend.url'), '/') . '/admin/reports',
                'placeName' => $this->report->photo?->visit?->place?->name,
            ],
        );
    }
}
