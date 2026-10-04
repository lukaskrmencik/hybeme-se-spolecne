<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $code,
        public int $validMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->code} je tvůj ověřovací kód",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.verificationCode',
            text: 'emails.verificationCode-text',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
