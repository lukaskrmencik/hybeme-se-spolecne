<?php

namespace App\Services;

class VisitPayload
{
    public static function open(mixed $sealed, string $base64Key): ?array
    {
        if (!is_string($sealed)) {
            return null;
        }
        $key = base64_decode($base64Key, true);
        $raw = base64_decode($sealed, true);
        if ($key === false || strlen($key) !== 32 || $raw === false || strlen($raw) < 12 + 16 + 2) {
            return null;
        }

        $nonce = substr($raw, 0, 12);
        $tag = substr($raw, -16);
        $ciphertext = substr($raw, 12, -16);
        $json = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($json === false) {
            return null;
        }

        $data = json_decode($json, true);

        return is_array($data) ? $data : null;
    }
}
