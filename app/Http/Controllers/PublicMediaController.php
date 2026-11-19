<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicMediaController extends Controller
{
    public function show(string $path): StreamedResponse
    {
        abort_unless(preg_match('#^(?:weddings/[0-9]+|event-music)/[A-Za-z0-9._-]+$#', $path) === 1, 404);
        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404);
        $mime = $disk->mimeType($path) ?: 'application/octet-stream';
        if ($mime === 'application/ogg') $mime = 'audio/ogg';
        abort_unless(str_starts_with($mime, 'image/') || str_starts_with($mime, 'audio/'), 404);

        return $disk->response($path, null, [
            'Content-Type' => $mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
