<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Wedding;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WeddingController extends Controller
{
    public function index()
    {
        return response()->json(
            Wedding::with('events')->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:weddings,slug'],
            'bride_name' => ['nullable', 'string', 'max:255'],
            'groom_name' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'array'],
            'design_settings' => ['nullable', 'array'],
        ]);

        $data['slug'] = Str::slug(
            $data['slug'] ?? $data['title'] ?? 'wedding'
        );

        $baseSlug = $data['slug'];
        $counter = 1;

        while (Wedding::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $baseSlug . '-' . $counter++;
        }

        $wedding = Wedding::create($data);

        return response()->json([
            'message' => 'Wedding created successfully.',
            'wedding' => $wedding,
        ], 201);
    }

    public function show(Wedding $wedding)
    {
        return response()->json(
            $wedding->load('events', 'guests')
        );
    }

    public function update(Request $request, Wedding $wedding)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'slug' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique('weddings', 'slug')->ignore($wedding->id),
            ],
            'bride_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'groom_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'content' => ['sometimes', 'nullable', 'array'],
            'design_settings' => ['sometimes', 'nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $wedding->update($data);

        return response()->json([
            'message' => 'Wedding updated successfully.',
            'wedding' => $wedding->fresh(),
        ]);
    }

    public function destroy(Wedding $wedding)
    {
        $wedding->delete();

        return response()->json([
            'message' => 'Wedding deleted successfully.',
        ]);
    }
}
