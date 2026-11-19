<?php
use App\Http\Controllers\Api\Admin\GuestController;
use App\Http\Controllers\Api\Admin\EventController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\Admin\AuthController;
use App\Http\Controllers\Api\Admin\WeddingController;
use App\Http\Controllers\Api\Admin\WeddingMediaController;
use App\Http\Controllers\Api\RsvpController;
use App\Http\Controllers\Api\Admin\EventMusicController;

Route::post('/admin/login', [AuthController::class, 'login']);

Route::middleware(['auth.local-development', 'admin'])->prefix('admin')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('weddings', WeddingController::class);

        // Wedding event management
    Route::get('/weddings/{wedding}/events', [EventController::class, 'index']);
    Route::post('/weddings/{wedding}/events', [EventController::class, 'store']);
    Route::put('/weddings/{wedding}/events/{eventId}', [EventController::class, 'update']);
    Route::delete('/weddings/{wedding}/events/{eventId}', [EventController::class, 'destroy']);
    Route::post('/weddings/{wedding}/events/{eventId}/music', [EventMusicController::class, 'store']);
    Route::delete('/weddings/{wedding}/events/{eventId}/music', [EventMusicController::class, 'destroy']);

    // Guest management
Route::get('/weddings/{wedding}/guests', [GuestController::class, 'index']);
Route::post('/weddings/{wedding}/guests', [GuestController::class, 'store']);
Route::post('/weddings/{wedding}/guests/import', [GuestController::class, 'import']);
Route::delete('/weddings/{wedding}/guests/{guestId}', [GuestController::class, 'destroy']);
Route::put('/weddings/{wedding}/guests/{guestId}', [GuestController::class, 'update']);
Route::get('/weddings/{wedding}/rsvp-summary', [GuestController::class, 'rsvpSummary']);
Route::post('/weddings/{wedding}/media', [WeddingMediaController::class, 'store']);
Route::delete('/weddings/{wedding}/media', [WeddingMediaController::class, 'destroy']);
});

Route::get('/invitation/{slug}', [InvitationController::class, 'show']);
Route::get('/guest-invitation/{token}', [InvitationController::class, 'guest']);
Route::post('/guest-invitation/{token}/rsvp', [RsvpController::class, 'store']);
