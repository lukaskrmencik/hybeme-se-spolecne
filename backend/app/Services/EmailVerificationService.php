<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

/**
 * Six-digit code sent by e-mail after registration. Without it the account cannot sign in,
 * so people have to register with an address they really own.
 */
class EmailVerificationService
{
    public const VALID_MINUTES = 15;
    public const MAX_ATTEMPTS = 5;
    /** A new code can be requested this long after the previous one. */
    public const RESEND_SECONDS = 60;

    /**
     * Creates a new code (replacing the old one) and e-mails it.
     *
     * @return int seconds until another code may be sent; 0 when this one was sent
     */
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

        // A fresh hash always differs, so updated_at moves too; the resend timer counts from it.
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

    /**
     * @return string|null an error message for the user, null when the e-mail is now verified
     */
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
