<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wedding;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $wedding = Wedding::with('events')
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($this->invitationPayload($wedding));
    }

    public function guest(string $token): JsonResponse
    {
        $guest = Guest::with(['wedding.events', 'rsvp'])
            ->where('invitation_token', $token)
            ->firstOrFail();

        if (!$guest->wedding || !$guest->wedding->is_active) {
            abort(404);
        }

        $guest->update([
            'first_viewed_at' => $guest->first_viewed_at ?? now(),
        ]);

        return response()->json($this->invitationPayload($guest->wedding) + [
            'guest' => ['name' => $guest->name, 'allowed_guests' => $guest->allowed_guests],
            'rsvp' => $guest->rsvp ? [
                'status' => $guest->rsvp->status,
                'attending_count' => $guest->rsvp->attending_count,
                'message' => $guest->rsvp->message,
            ] : null,
        ]);
    }

    private function invitationPayload(Wedding $wedding): array
    {
        $content = $wedding->content ?? [];
        foreach (['bride_photo', 'groom_photo', 'music'] as $key) {
            if (!empty($content[$key]) && !str_starts_with($content[$key], 'http') && !str_starts_with($content[$key], '/wedding-media/')) {
                $content[$key] = '/wedding-media/'.$content[$key];
            }
        }
        $content['gallery'] = array_map(function ($item) {
            if (!empty($item['path'])) {
                $item['url'] = '/wedding-media/'.$item['path'];
                unset($item['path']);
            }
            return $item;
        }, $content['gallery'] ?? []);

        $events = $wedding->events()->orderBy('sort_order')->get([
            'event_name', 'event_name_bn', 'description', 'description_bn', 'event_date', 'venue', 'venue_bn', 'address', 'address_bn', 'map_url',
            'music_path', 'music_title', 'music_artist', 'music_enabled', 'sort_order',
        ])->map(function ($event) {
            $data = $event->toArray();
            if (!$event->music_enabled) $data['music_url'] = null;
            return $data;
        });

        return [
            'wedding' => [
                'title' => $wedding->title,
                'slug' => $wedding->slug,
                'bride_name' => $wedding->bride_name,
                'groom_name' => $wedding->groom_name,
                'content' => $content,
                'design_settings' => $wedding->design_settings ?? [],
            ],
            'events' => $events,
        ];
    }
}
