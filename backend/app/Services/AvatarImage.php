<?php

namespace App\Services;

class AvatarImage
{
    public const MAX_SIDE = 512;

    public static function shrink(string $path, int $maxSide = self::MAX_SIDE): bool
    {
        if (!function_exists('imagecreatefromstring') || !is_file($path)) {
            return false;
        }
        $image = @imagecreatefromstring((string) file_get_contents($path));
        if ($image === false) {
            return false;
        }

        $image = self::applyExifOrientation($image, $path);
        $width = imagesx($image);
        $height = imagesy($image);
        if (max($width, $height) <= $maxSide) {
            imagedestroy($image);
            return false;
        }

        $scale = $maxSide / max($width, $height);
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));
        $small = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($small, false);
        imagesavealpha($small, true);
        imagecopyresampled($small, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $saved = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => imagepng($small, $path, 6),
            'webp' => imagewebp($small, $path, 80),
            default => imagejpeg($small, $path, 82),
        };
        imagedestroy($image);
        imagedestroy($small);

        return $saved;
    }

    private static function applyExifOrientation(\GdImage $image, string $path): \GdImage
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }
        $exif = @exif_read_data($path);
        $angle = match ((int) ($exif['Orientation'] ?? 1)) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };
        if ($angle === 0) {
            return $image;
        }
        $rotated = imagerotate($image, $angle, 0);
        if ($rotated === false) {
            return $image;
        }
        imagedestroy($image);

        return $rotated;
    }
}
