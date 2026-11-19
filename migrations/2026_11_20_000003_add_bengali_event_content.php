<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wedding_events', function (Blueprint $table) {
            $table->string('event_name_bn')->nullable();
            $table->text('description_bn')->nullable();
            $table->string('venue_bn')->nullable();
            $table->text('address_bn')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('wedding_events', function (Blueprint $table) {
            $table->dropColumn(['event_name_bn', 'description_bn', 'venue_bn', 'address_bn']);
        });
    }
};
