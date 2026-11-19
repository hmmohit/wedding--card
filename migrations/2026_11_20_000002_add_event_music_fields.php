<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wedding_events', function (Blueprint $table) {
            $table->string('music_path')->nullable();
            $table->string('music_title')->nullable();
            $table->string('music_artist')->nullable();
            $table->boolean('music_enabled')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('wedding_events', function (Blueprint $table) {
            $table->dropColumn(['music_path', 'music_title', 'music_artist', 'music_enabled']);
        });
    }
};
