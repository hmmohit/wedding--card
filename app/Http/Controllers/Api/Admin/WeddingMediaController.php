<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Wedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WeddingMediaController extends Controller
{
    public function store(Request $request, Wedding $wedding)
    {
        $kind = $request->input('kind');
        $fileRules = ['required', 'file', 'max:'.($kind === 'music' ? 20480 : 8192)];
        if ($kind === 'music') {
            $fileRules[] = 'mimetypes:audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-wav,audio/aac';
        } else {
            $fileRules[] = 'image';
            $fileRules[] = 'mimes:jpg,jpeg,png,webp';
        }
        $request->validate([
            'kind' => ['required', 'in:bride_photo,groom_photo,gallery,music'],
            'file' => $fileRules,
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $path = $request->file('file')->store("weddings/{$wedding->id}", 'public');
        $content = $wedding->content ?? [];
        if ($kind === 'gallery') {
            $content['gallery'] = array_values($content['gallery'] ?? []);
            $content['gallery'][] = ['path' => $path, 'caption' => $request->input('caption')];
        } else {
            $content[$kind] = $path;
        }
        $wedding->update(['content' => $content]);

        return response()->json(['message' => 'Media uploaded.', 'content' => $this->publicContent($content)], 201);
    }

    public function destroy(Request $request, Wedding $wedding)
    {
        $data = $request->validate([
            'kind' => ['required', 'in:bride_photo,groom_photo,gallery,music'],
            'path' => ['required', 'string', 'max:512'],
        ]);
        $expectedPrefix = "weddings/{$wedding->id}/";
        abort_unless(str_starts_with($data['path'], $expectedPrefix), 422, 'Invalid media path.');
        $content = $wedding->content ?? [];
        if ($data['kind'] === 'gallery') {
            $items = array_values(array_filter($content['gallery'] ?? [], fn ($item) => ($item['path'] ?? null) !== $data['path']));
            abort_if(count($items) === count($content['gallery'] ?? []), 404);
            $content['gallery'] = $items;
        } else {
            abort_unless(($content[$data['kind']] ?? null) === $data['path'], 404);
            unset($content[$data['kind']]);
        }
        Storage::disk('public')->delete($data['path']);
        $wedding->update(['content' => $content]);
        return response()->json(['message' => 'Media removed.', 'content' => $this->publicContent($content)]);
    }

    private function publicContent(array $content): array
    {
        foreach (['bride_photo', 'groom_photo', 'music'] as $key) {
            if (!empty($content[$key])) $content[$key] = '/wedding-media/'.$content[$key];
        }
        $content['gallery'] = array_map(fn ($item) => [
            'url' => '/wedding-media/'.$item['path'],
            'caption' => $item['caption'] ?? null,
        ], $content['gallery'] ?? []);
        return $content;
    }
}
