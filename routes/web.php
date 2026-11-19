<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicMediaController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/wedding-media/{path}', [PublicMediaController::class, 'show'])->where('path', '.*');
