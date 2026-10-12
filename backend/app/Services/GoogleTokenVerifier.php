<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleTokenVerifier
{
    private const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    public function verify(string $idToken): ?array
    {
        $clientIds = config('services.google.client_ids');
        if (empty($clientIds)) {
            throw new RuntimeException('Google client id is not configured.');
        }

        try {
            $response = Http::timeout(10)->get(self::TOKENINFO_URL, ['id_token' => $idToken]);
        } catch (\Exception $e) {
            throw new RuntimeException('Google tokeninfo is unreachable.', 0, $e);
        }

        if ($response->serverError()) {
            throw new RuntimeException('Google tokeninfo failed.');
        }
        if (!$response->successful()) {
            return null;
        }

        $payload = $response->json();
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if (
            empty($payload['sub'])
            || empty($payload['email'])
            || !$emailVerified
            || !in_array($payload['aud'] ?? null, $clientIds, true)
            || !in_array($payload['iss'] ?? null, self::ISSUERS, true)
            || (int) ($payload['exp'] ?? 0) < time()
        ) {
            return null;
        }

        return [
            'sub' => (string) $payload['sub'],
            'email' => mb_strtolower($payload['email']),
            'name' => $payload['name'] ?? null,
            'picture' => $payload['picture'] ?? null,
        ];
    }
}
