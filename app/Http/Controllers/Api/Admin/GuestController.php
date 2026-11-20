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

    // Import guests from CSV or Excel (.xlsx)
    public function import(Request $request, Wedding $wedding)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx', 'max:5120'],
        ]);

        $uploaded = $request->file('file');
        $extension = strtolower($uploaded->getClientOriginalExtension());
        $rows = [];

        if ($extension === 'xlsx') {
            if (!class_exists(\ZipArchive::class)) {
                return response()->json([
                    'message' => 'Excel import requires the PHP Zip extension. Enable extension=zip in php.ini and restart Apache.',
                ], 422);
            }

            $zip = new \ZipArchive();
            if ($zip->open($uploaded->getRealPath()) !== true) {
                return response()->json(['message' => 'Could not open the Excel workbook.'], 422);
            }

            try {
                $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
                if ($sheetXml === false) {
                    return response()->json(['message' => 'The Excel workbook has no readable first worksheet.'], 422);
                }

                $sharedStrings = [];
                $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
                if ($sharedXml !== false) {
                    $shared = simplexml_load_string($sharedXml, 'SimpleXMLElement', LIBXML_NONET);
                    if ($shared !== false) {
                        $sharedNs = $shared->getNamespaces(true);
                        $sharedMainNs = $sharedNs[''] ?? null;
                        foreach ($shared->children($sharedMainNs)->si as $item) {
                            $parts = [];
                            foreach ($item->children($sharedMainNs)->t as $part) {
                                $parts[] = (string) $part;
                            }
                            foreach ($item->children($sharedMainNs)->r as $run) {
                                $parts[] = (string) $run->children($sharedMainNs)->t;
                            }
                            $sharedStrings[] = implode('', $parts);
                        }
                    }
                }

                $sheet = simplexml_load_string($sheetXml, 'SimpleXMLElement', LIBXML_NONET);
                if ($sheet === false) {
                    return response()->json(['message' => 'The first worksheet could not be read.'], 422);
                }

                $sheetNs = $sheet->getNamespaces(true);
                $mainNs = $sheetNs[''] ?? null;
                $sheetData = $sheet->children($mainNs)->sheetData;

                foreach ($sheetData->children($mainNs)->row as $row) {
                    $values = [];
                    foreach ($row->children($mainNs)->c as $cell) {
                        $attributes = $cell->attributes();
                        $reference = (string) ($attributes['r'] ?? '');
                        preg_match('/^[A-Z]+/', $reference, $matches);
                        if (!$matches) {
                            continue;
                        }

                        $column = 0;
                        foreach (str_split($matches[0]) as $letter) {
                            $column = ($column * 26) + (ord($letter) - 64);
                        }
                        $column--;

                        $cellType = (string) ($attributes['t'] ?? '');
                        $cellValue = '';
                        $cellChildren = $cell->children($mainNs);

                        if ($cellType === 's') {
                            $index = (int) $cellChildren->v;
                            $cellValue = $sharedStrings[$index] ?? '';
                        } elseif ($cellType === 'inlineStr') {
                            $cellValue = (string) $cellChildren->is->t;
                        } else {
                            $cellValue = (string) $cellChildren->v;
                        }

                        $values[$column] = trim($cellValue);
                    }

                    if ($values) {
                        ksort($values);
                        $lastColumn = max(array_keys($values));
                        $normalized = [];
                        for ($i = 0; $i <= $lastColumn; $i++) {
                            $normalized[] = $values[$i] ?? '';
                        }
                        $rows[] = $normalized;
                    }
                }
            } finally {
                $zip->close();
            }
        } else {
            $handle = fopen($uploaded->getRealPath(), 'r');
            if (!$handle) {
                return response()->json(['message' => 'Could not read the CSV file.'], 422);
            }

            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }

        if (count($rows) < 1) {
            return response()->json(['message' => 'The uploaded file is empty.'], 422);
        }

        $headers = array_map(
            fn ($header) => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $header))),
            array_shift($rows)
        );

        if (!in_array('name', $headers, true)) {
            return response()->json([
                'message' => 'Your file must contain a name column. Optional columns: phone, group_name, allowed_guests.',
            ], 422);
        }

        $imported = 0;
        $skipped = 0;

        DB::beginTransaction();

        try {
            foreach ($rows as $row) {
                if (count($row) !== count($headers)) {
                    $skipped++;
                    continue;
                }

                $record = array_combine($headers, $row);
                $name = trim((string) ($record['name'] ?? ''));

                if ($name === '') {
                    $skipped++;
                    continue;
                }

                $allowed = filter_var($record['allowed_guests'] ?? 1, FILTER_VALIDATE_INT);
                if ($allowed === false || $allowed < 1 || $allowed > 100) {
                    $allowed = 1;
                }

                $guest = new Guest();
                $guest->wedding_id = $wedding->id;
                $guest->name = $name;
                $guest->phone = trim((string) ($record['phone'] ?? '')) ?: null;
                $guest->group_name = trim((string) ($record['group_name'] ?? '')) ?: null;
                $guest->allowed_guests = $allowed;
                $guest->invitation_token = Str::random(64);
                $guest->save();

                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

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
