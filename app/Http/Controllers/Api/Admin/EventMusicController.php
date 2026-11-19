<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Wedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EventMusicController extends Controller
{
    public function store(Request $request, Wedding $wedding, int $eventId)
    {
        $event = $wedding->events()->findOrFail($eventId);
        $data = $request->validate([
            'file' => ['required', 'file', 'max:20480', 'mimetypes:audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/x-wav,audio/aac'],
            'music_title' => ['required', 'string', 'max:255'],
            'music_artist' => ['nullable', 'string', 'max:255'],
            'music_enabled' => ['required', 'boolean'],
        ]);

        $newPath = $request->file('file')->store('event-music', 'public');
        $oldPath = $event->music_path;
        $event->music_path = $newPath;
        $event->music_title = $data['music_title'];
        $event->music_artist = $data['music_artist'] ?? null;
        $event->music_enabled = $data['music_enabled'];
        $event->save();

        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['message' => 'Event music saved.', 'event' => $event->fresh()]);
    }

    public function destroy(Wedding $wedding, int $eventId)
    {
        $event = $wedding->events()->findOrFail($eventId);
        if ($event->music_path) {
            Storage::disk('public')->delete($event->music_path);
        }
        $event->music_path = null;
        $event->music_title = null;
        $event->music_artist = null;
        $event->music_enabled = false;
        $event->save();

        return response()->json(['message' => 'Event music removed.', 'event' => $event->fresh()]);
    }
}
