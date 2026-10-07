<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailVerificationService;
use App\Services\GoogleTokenVerifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use RuntimeException;

class AuthController extends Controller
{
    public function login(Request $request, EmailVerificationService $verification)
    {
        $credentials = $request->only(['email', 'password']);

        if (! $token = auth('api')->attempt($credentials)) {
            return response()->error('Neplatné přihlašovací údaje', 401);
        }

        $user = auth('api')->user();
        if (!$user->hasVerifiedEmail()) {
            auth('api')->invalidate(true);
            return $this->verificationRequired($user, $verification, 'Nejdřív ověř svůj e-mail. Poslali jsme ti na něj kód.', 403);
        }

        return response()->success(["token" => $token]);
    }

    /**
     * Creates the account and e-mails a verification code; the token comes after the code is confirmed
     * (verifyEmail). Registering again with an unverified e-mail updates that account and sends a new code,
     * so a typo or a lost e-mail never locks the address.
     */
    public function register(Request $request, EmailVerificationService $verification)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255',
            'password' => [
                'required',
                'string',
                'confirmed',
                'max:255',
                Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers(),
            ],
            // Agreement to the terms and privacy policy, incl. that a parent agreed for a child under 15.
            'terms' => 'accepted',
        ], [
            'terms.accepted' => 'Pro registraci je potřeba souhlasit s podmínkami používání.',
        ]);

        $email = mb_strtolower(trim($validatedData['email']));
        $terms = ['terms_accepted_at' => now(), 'terms_version' => config('general.termsVersion')];
        $existing = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($existing && $existing->hasVerifiedEmail()) {
            throw ValidationException::withMessages(['email' => 'Tento e-mail už je zaregistrovaný.']);
        }

        if ($existing) {
            $existing->update([
                'name' => $validatedData['name'],
                'password' => Hash::make($validatedData['password']),
                ...$terms,
            ]);
            $user = $existing;
        } else {
            $user = User::create([
                'name' => $validatedData['name'],
                'role' => "user",
                'email' => $email,
                'password' => Hash::make($validatedData['password']),
                ...$terms,
            ]);
        }

        return $this->verificationRequired($user, $verification, null, 201);
    }

    public function verifyEmail(Request $request, EmailVerificationService $verification)
    {
        $validatedData = $request->validate([
            'email' => 'required|string|email|max:255',
            'code' => 'required|string|digits:6',
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [mb_strtolower(trim($validatedData['email']))])->first();
        if (!$user) {
            return response()->error('Kód nesouhlasí.', 422);
        }

        $error = $verification->verify($user, $validatedData['code']);
        if ($error) {
            return response()->error($error, 422);
        }

        $token = auth('api')->login($user);

        return response()->success(["token" => $token]);
    }

    /** Always answers the same way, so it cannot be used to find out which e-mails are registered. */
    public function resendVerificationCode(Request $request, EmailVerificationService $verification)
    {
        $validatedData = $request->validate([
            'email' => 'required|string|email|max:255',
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [mb_strtolower(trim($validatedData['email']))])->first();
        if (!$user || $user->hasVerifiedEmail()) {
            return response()->success(['resend_in' => EmailVerificationService::RESEND_SECONDS]);
        }

        try {
            $wait = $verification->send($user);
        } catch (TransportExceptionInterface $e) {
            report($e);
            return response()->error('E-mail se nepodařilo odeslat. Zkus to prosím za chvíli.', 503);
        }

        if ($wait > 0) {
            return response()->error("Nový kód si můžeš poslat za {$wait} s.", 429);
        }

        return response()->success(['resend_in' => EmailVerificationService::RESEND_SECONDS]);
    }

    /** Sends a code (unless one went out a moment ago) and tells the app to show the code screen. */
    private function verificationRequired(User $user, EmailVerificationService $verification, ?string $message, int $status)
    {
        try {
            $wait = $verification->send($user);
        } catch (TransportExceptionInterface $e) {
            report($e);
            return response()->error('Ověřovací e-mail se nepodařilo odeslat. Zkus to prosím za chvíli.', 503);
        }

        return response()->json([
            'status' => $status >= 400 ? 'error' : 'success',
            'status_code' => $status,
            'error_message' => $message,
            'code' => 'email_not_verified',
            'data' => [
                'verification_required' => true,
                'email' => $user->email,
                'resend_in' => $wait > 0 ? $wait : EmailVerificationService::RESEND_SECONDS,
            ],
        ], $status);
    }

    /** Signs in with a Google ID token sent by the app (the Android sign-in). */
    public function google(Request $request, GoogleTokenVerifier $verifier)
    {
        $validatedData = $request->validate([
            'id_token' => 'required|string|max:4096',
        ]);

        try {
            $google = $verifier->verify($validatedData['id_token']);
        } catch (RuntimeException $e) {
            report($e);
            return response()->error('Přihlášení přes Google teď nefunguje, zkus to prosím později.', 503);
        }

        if (!$google) {
            return response()->error('Přihlášení přes Google se nepodařilo ověřit.', 401);
        }

        $user = $this->findOrCreateGoogleUser($google);
        $token = auth('api')->login($user);

        return response()->success(["token" => $token]);
    }

    /**
     * Web sign-in without a popup: Google Identity Services in redirect mode posts the ID token here
     * as a form, and the browser is sent back to the app with our token in the URL fragment
     * (a fragment never reaches any server or log). Errors go back the same way.
     */
    public function googleRedirect(Request $request, GoogleTokenVerifier $verifier)
    {
        $back = rtrim((string) config('services.google.web_redirect_url'), '/');
        $fail = fn (string $message) => redirect()->away($back . '#google_error=' . rawurlencode($message));

        // Double-submit check from Google: the cookie is set on the app's page, the same value comes in the form.
        // A browser may drop the cookie on this cross-site post, so only a mismatch is refused.
        $cookie = $request->cookies->get('g_csrf_token');
        $field = $request->input('g_csrf_token');
        if ($cookie !== null && $cookie !== $field) {
            return $fail('Přihlášení přes Google se nepodařilo ověřit.');
        }

        $idToken = $request->input('credential');
        if (!is_string($idToken) || $idToken === '' || strlen($idToken) > 4096) {
            return $fail('Google nevrátil přihlašovací údaje.');
        }

        try {
            $google = $verifier->verify($idToken);
        } catch (RuntimeException $e) {
            report($e);
            return $fail('Přihlášení přes Google teď nefunguje, zkus to prosím později.');
        }

        if (!$google) {
            return $fail('Přihlášení přes Google se nepodařilo ověřit.');
        }

        // The browser is on a full-page redirect here, so even an unexpected failure must lead back to the app.
        try {
            $token = auth('api')->login($this->findOrCreateGoogleUser($google));
        } catch (\Throwable $e) {
            report($e);
            return $fail('Přihlášení přes Google se nezdařilo. Zkus to prosím později.');
        }

        return redirect()->away($back . '#google_token=' . rawurlencode($token));
    }

    /**
     * An account with the same (Google-verified) e-mail is linked, otherwise a new one is created without a password.
     */
    private function findOrCreateGoogleUser(array $google): User
    {
        $user = User::where('provider_name', 'google')->where('provider_id', $google['sub'])->first()
            ?? User::whereRaw('LOWER(email) = ?', [$google['email']])->first();

        if (!$user) {
            return User::create([
                'name' => mb_substr($google['name'] ?: strstr($google['email'], '@', true), 0, 255),
                'role' => 'user',
                'email' => $google['email'],
                'provider_name' => 'google',
                'provider_id' => $google['sub'],
                'avatar_url' => $google['picture'],
                'email_verified_at' => now(),
            ]);
        }

        // Google has verified the e-mail. An unverified account with it was registered by someone who never
        // proved owning the address, so its password must not keep working (pre-account hijacking).
        if (!$user->hasVerifiedEmail()) {
            $user->password = null;
            $user->email_verified_at = now();
            $user->verificationCode()->delete();
        }

        if ($user->provider_name !== 'google' || $user->provider_id !== $google['sub']) {
            $user->provider_name = 'google';
            $user->provider_id = $google['sub'];
        }
        if (!$user->avatar_url && $google['picture']) {
            $user->avatar_url = $google['picture'];
        }
        $user->save();

        return $user;
    }

    public function refresh()
    {
        try {
            $newToken = auth('api')->refresh(true, true);
            return response()->success(["token" => $newToken]);

        } catch (\Exception $e) {
            return response()->error('Chyba tokenu, přihlašte se manuálně.', 401);
        }
    }

    public function logout()
    {
        auth('api')->logout();
        return response()->success(["message" => "Odhlášení proběhlo úspěšně."]);
    }

}
