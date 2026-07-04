<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class ImageModerationService
{
    public function isSafe(UploadedFile $file): bool
    {
        try {
            $imageData = file_get_contents($file->getPathname());

            $response = Http::withBody($imageData, 'application/octet-stream')
                ->timeout(10)
                ->post('http://nsfw-api:3333/classify');

            if ($response->failed()) {
                return true;
            }

            $result = $response->json();
            $predictions = collect($result['prediction'] ?? []);

            $pornScore = $predictions->firstWhere('className', 'Porn')['probability'] ?? 0;
            $hentaiScore = $predictions->firstWhere('className', 'Hentai')['probability'] ?? 0;
            $sexyScore = $predictions->firstWhere('className', 'Sexy')['probability'] ?? 0;

            if ($pornScore > 0.3 || $hentaiScore > 0.3 || $sexyScore > 0.5) {
                return false;
            }

            return true;

        } catch (\Exception $e) {
            return true;
        }
    }
}
