<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin';

    protected $description = 'Create or update the wedding platform admin account';

    public function handle(): int
    {
        $name = $this->ask('Admin name');
        $email = $this->ask('Admin email');
        $password = $this->secret('Admin password');

        if (!$name || !$email || !$password || strlen($password) < 12) {
            $this->error('All fields are required. Password must contain at least 12 characters.');
            return self::FAILURE;
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'is_admin' => true,
            ]
        );

        $this->info("Admin account created/updated: {$user->email}");

        return self::SUCCESS;
    }
}
