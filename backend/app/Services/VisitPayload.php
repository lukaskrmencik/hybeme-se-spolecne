<?php

namespace App\Services;

/**
 * Visits come from the app sealed with AES-256-GCM: {"p": base64(nonce[12] . ciphertext . tag[16])}.
 * The key is in the app too, so this is no real protection. It only hides the format from whoever looks
 * at the requests in the browser, which is the easiest way to forge a visit.
 */
class VisitPayload
{
    /** The fields of the visit, or null when the payload is missing or was not sealed with our key. */
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
