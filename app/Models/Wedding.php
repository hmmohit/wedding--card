<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wedding extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'bride_name',
        'groom_name',
        'content',
        'design_settings',
        'is_active',
    ];

    protected $casts = [
        'content' => 'array',
        'design_settings' => 'array',
        'is_active' => 'boolean',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(WeddingEvent::class);
    }

    public function guests(): HasMany
    {
        return $this->hasMany(Guest::class);
    }
}
