
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weddings', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->string('slug')->unique();
            $table->string('bride_name')->nullable();
            $table->string('groom_name')->nullable();
            $table->json('content')->nullable();
            $table->json('design_settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('wedding_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wedding_id')->constrained()->cascadeOnDelete();
            $table->string('event_name');
            $table->text('description')->nullable();
            $table->dateTime('event_date')->nullable();
            $table->string('venue')->nullable();
            $table->text('address')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('guests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wedding_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('invitation_token')->unique();
            $table->string('group_name')->nullable();
            $table->unsignedInteger('allowed_guests')->default(1);
            $table->timestamp('first_viewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('rsvps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->unsignedInteger('attending_count')->default(0);
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rsvps');
        Schema::dropIfExists('guests');
        Schema::dropIfExists('wedding_events');
        Schema::dropIfExists('weddings');
    }
};
