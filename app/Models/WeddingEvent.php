<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeddingEvent extends Model
{
    protected $fillable = [
        'wedding_id',
        'event_name',
        'event_name_bn',
        'description',
        'description_bn',
        'event_date',
        'venue',
        'venue_bn',
        'address',
        'address_bn',
        'map_url',
        'music_path',
        'music_title',
        'music_artist',
        'music_enabled',
        'sort_order',
    ];

    protected $hidden = ['music_path'];

    protected $appends = ['music_url'];

    protected $casts = [
        'event_date' => 'datetime',
        'music_enabled' => 'boolean',
    ];

    public function getMusicUrlAttribute(): ?string
    {
        return $this->music_path ? '/wedding-media/'.$this->music_path : null;
    }

    public function wedding(): BelongsTo
    {
        return $this->belongsTo(Wedding::class);
    }
}
