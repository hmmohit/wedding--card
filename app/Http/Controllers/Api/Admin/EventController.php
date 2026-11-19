<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Wedding;
use App\Models\WeddingEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EventController extends Controller
{
    public function index(Wedding $wedding)
    {
        return response()->json(
            $wedding->events()->orderBy('sort_order')->get()
        );
    }

    public function store(Request $request, Wedding $wedding)
    {
        $data = $request->validate([
            'event_name' => ['required', 'string', 'max:255'],
            'event_name_bn' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'description_bn' => ['nullable', 'string'],
            'event_date' => ['nullable', 'date'],
            'venue' => ['nullable', 'string', 'max:255'],
            'venue_bn' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'address_bn' => ['nullable', 'string'],
            'map_url' => ['nullable', 'url', 'max:2048'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $event = new WeddingEvent();
        $event->wedding_id = $wedding->id;

        foreach ($data as $key => $value) {
            $event->{$key} = $value;
        }
        $event->music_enabled = false;

        $event->save();

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event,
        ], 201);
    }

    public function update(Request $request, Wedding $wedding, int $eventId)
    {
        $event = $wedding->events()->findOrFail($eventId);

        $data = $request->validate([
            'event_name' => ['sometimes', 'required', 'string', 'max:255'],
            'event_name_bn' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'description_bn' => ['nullable', 'string'],
            'event_date' => ['nullable', 'date'],
            'venue' => ['nullable', 'string', 'max:255'],
            'venue_bn' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'address_bn' => ['nullable', 'string'],
            'map_url' => ['nullable', 'url', 'max:2048'],
            'music_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'music_artist' => ['sometimes', 'nullable', 'string', 'max:255'],
            'music_enabled' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (($data['music_enabled'] ?? false) && !$event->music_path) {
            return response()->json(['message' => 'Upload an event track before enabling music.'], 422);
        }

        foreach ($data as $key => $value) {
            $event->{$key} = $value;
        }

        $event->save();

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event,
        ]);
    }

    public function destroy(Wedding $wedding, int $eventId)
    {
        $event = $wedding->events()->findOrFail($eventId);
        if ($event->music_path) {
            Storage::disk('public')->delete($event->music_path);
        }
        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    }
}
