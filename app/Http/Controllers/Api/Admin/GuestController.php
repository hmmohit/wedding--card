<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Wedding;
use App\Models\Guest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GuestController extends Controller
{
    // List guests belonging to a wedding
    public function index(Wedding $wedding)
    {
        $guests = $wedding->guests()
            ->orderByDesc('id')
            ->get();

        return response()->json($guests);
    }

    // Add one guest
    public function store(Request $request, Wedding $wedding)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'group_name' => ['nullable', 'string', 'max:255'],
            'allowed_guests' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $guest = new Guest();
        $guest->wedding_id = $wedding->id;
        $guest->name = $data['name'];
        $guest->phone = $data['phone'] ?? null;
        $guest->group_name = $data['group_name'] ?? null;
        $guest->allowed_guests = $data['allowed_guests'] ?? 1;
        $guest->invitation_token = Str::random(64);
        $guest->save();

        return response()->json([
            'message' => 'Guest added successfully.',
            'guest' => $guest,
            'invitation_path' => '/guest-invitation/' . $guest->invitation_token,
        ], 201);
    }

    // Import guests from a CSV file
    public function import(Request $request, Wedding $wedding)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');

        if (!$handle) {
            return response()->json([
                'message' => 'Could not read the CSV file.',
            ], 422);
        }

        $headers = fgetcsv($handle);

        if (!$headers) {
            fclose($handle);

            return response()->json([
                'message' => 'The CSV file is empty.',
            ], 422);
        }

        $headers = array_map(
            fn ($header) => strtolower(trim((string) $header)),
            $headers
        );

        if (!in_array('name', $headers, true)) {
            fclose($handle);

            return response()->json([
                'message' => 'Your CSV must contain a name column.',
            ], 422);
        }

        $imported = 0;
        $skipped = 0;
        $rowNumber = 1;

        DB::beginTransaction();

        try {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                if (count($row) !== count($headers)) {
                    $skipped++;
                    continue;
                }

                $record = array_combine($headers, $row);

                $name = trim($record['name'] ?? '');

                if ($name === '') {
                    $skipped++;
                    continue;
                }

                $allowed = filter_var(
                    $record['allowed_guests'] ?? 1,
                    FILTER_VALIDATE_INT
                );

                if ($allowed === false || $allowed < 1 || $allowed > 100) {
                    $allowed = 1;
                }

                $guest = new Guest();
                $guest->wedding_id = $wedding->id;
                $guest->name = $name;
                $guest->phone = trim($record['phone'] ?? '') ?: null;
                $guest->group_name = trim($record['group_name'] ?? '') ?: null;
                $guest->allowed_guests = $allowed;
                $guest->invitation_token = Str::random(64);
                $guest->save();

                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($handle);
            throw $e;
        }

        fclose($handle);

        return response()->json([
            'message' => 'Guest import completed.',
            'imported' => $imported,
            'skipped' => $skipped,
        ]);
    }

    // Delete a guest
    public function destroy(Wedding $wedding, int $guestId)
    {
        $guest = $wedding->guests()->findOrFail($guestId);
        $guest->delete();

        return response()->json([
            'message' => 'Guest deleted successfully.',
        ]);
    }

    public function update(Request $request, Wedding $wedding, int $guestId)
    {
        $guest = $wedding->guests()->findOrFail($guestId);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'group_name' => ['nullable', 'string', 'max:255'],
            'allowed_guests' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ]);
        $guest->update($data);
        return response()->json(['message' => 'Guest updated successfully.', 'guest' => $guest->fresh()]);
    }

    public function rsvpSummary(Wedding $wedding)
    {
        $guests = $wedding->guests()->with('rsvp')->get();
        return response()->json([
            'total_invited' => $guests->count(),
            'confirmed' => $guests->filter(fn ($g) => $g->rsvp?->status === 'confirmed')->count(),
            'declined' => $guests->filter(fn ($g) => $g->rsvp?->status === 'declined')->count(),
            'pending' => $guests->filter(fn ($g) => !$g->rsvp || $g->rsvp->status === 'pending')->count(),
            'confirmed_attendees' => $guests->sum(fn ($g) => $g->rsvp?->status === 'confirmed' ? $g->rsvp->attending_count : 0),
            'guests' => $guests->map(fn ($g) => [
                'id' => $g->id, 'name' => $g->name, 'phone' => $g->phone,
                'allowed_guests' => $g->allowed_guests, 'first_viewed_at' => $g->first_viewed_at,
                'invitation_token' => $g->invitation_token,
                'rsvp' => $g->rsvp ? ['status' => $g->rsvp->status, 'attending_count' => $g->rsvp->attending_count, 'message' => $g->rsvp->message] : null,
            ]),
        ]);
    }
}
