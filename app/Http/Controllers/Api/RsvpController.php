<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use Illuminate\Http\Request;

class RsvpController extends Controller
{
    public function store(Request $request, string $token)
    {
        $guest = Guest::with('wedding')->where('invitation_token', $token)->firstOrFail();
        abort_unless($guest->wedding?->is_active, 404);
        $data = $request->validate([
            'status' => ['required', 'in:confirmed,declined'],
            'attending_count' => ['required', 'integer', 'min:0', 'max:'.$guest->allowed_guests],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);
        if ($data['status'] === 'confirmed') {
            validator($data, ['attending_count' => ['required', 'integer', 'min:1', 'max:'.$guest->allowed_guests]])->validate();
        } else {
            $data['attending_count'] = 0;
        }
        $rsvp = $guest->rsvp()->updateOrCreate([], $data);
        return response()->json(['message' => 'Your RSVP has been saved.', 'rsvp' => [
            'status' => $rsvp->status, 'attending_count' => $rsvp->attending_count, 'message' => $rsvp->message,
        ]]);
    }
}
