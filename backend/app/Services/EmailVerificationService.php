<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class EmailVerificationService
{
    public const VALID_MINUTES = 15;
    public const MAX_ATTEMPTS = 5;
    public const RESEND_SECONDS = 60;

    public function send(User $user): int
    {
        $existing = $user->verificationCode;
        if ($existing) {
            $wait = self::RESEND_SECONDS - (int) $existing->updated_at->diffInSeconds(now(), true);
            if ($wait > 0) {
                return $wait;
            }
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailVerificationCode::updateOrCreate(
            ['user_id' => $user->id],
            [
                'code_hash' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::VALID_MINUTES),
            ]
        );

        Mail::to($user->email)->send(new VerificationCodeMail($user->name, $code, self::VALID_MINUTES));

        return 0;
    }

    public function verify(User $user, string $code): ?string
    {
        if ($user->hasVerifiedEmail()) {
            return null;
        }

        $record = $user->verificationCode;
        if (!$record || $record->expires_at->isPast()) {
            return 'Platnost kódu vypršela. Pošli si nový.';
        }
        if ($record->attempts >= self::MAX_ATTEMPTS) {
            return 'Špatný kód byl zadán příliš mnohokrát. Pošli si nový.';
        }

        if (!Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');
            $left = self::MAX_ATTEMPTS - $record->attempts;
            return $left > 0
                ? "Kód nesouhlasí. Zbývá pokusů: {$left}."
                : 'Špatný kód byl zadán příliš mnohokrát. Pošli si nový.';
        }

        $user->forceFill(['email_verified_at' => now()])->save();
        $record->delete();

        return null;
    }
}
