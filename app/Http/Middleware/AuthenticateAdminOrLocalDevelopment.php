<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAdminOrLocalDevelopment
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user('sanctum')) {
            // Downstream middleware/controllers use $request->user() without
            // naming a guard. Ensure it resolves this bearer-token user.
            Auth::shouldUse('sanctum');

            return $next($request);
        }

        if ($this->mayUseLocalDevelopmentBypass($request)) {
            $user = new User();
            $user->forceFill([
                'name' => 'Local Development Admin',
                'email' => 'local-development@example.invalid',
                'is_admin' => true,
            ]);

            $request->setUserResolver(static fn ($guard = null) => $user);

            return $next($request);
        }

        return app(Authenticate::class)->handle($request, $next, 'sanctum');
    }

    private function mayUseLocalDevelopmentBypass(Request $request): bool
    {
        $loopbackAddresses = ['127.0.0.1', '::1'];
        $loopbackHosts = ['localhost', '127.0.0.1', '::1'];

        return config('local_development.admin_auth_bypass') === true
            && app()->environment('local')
            && in_array($request->ip(), $loopbackAddresses, true)
            && in_array(strtolower($request->getHost()), $loopbackHosts, true)
            && !$request->headers->has('CF-Connecting-IP')
            && !$request->headers->has('X-Forwarded-For')
            && !$request->headers->has('Forwarded');
    }
}
