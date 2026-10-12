<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Response;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        Response::macro('success', function ($data = [], $status = 200) {
            return Response::json([
                'status' => 'success',
                'status_code' => $status,
                'data' => $data,
            ], $status);
        });

        Response::macro('error', function ($message, $status = 400) {
            return Response::json([
                'status' => 'error',
                'status_code' => $status,
                'error_message' => $message,
            ], $status);
        });

        Response::macro('pagination', function ($paginator, $status = 200) {
            return Response::json([
                'status' => 'success',
                'status_code' => $status,
                'data' => [
                    'page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total_pages' => $paginator->lastPage(),
                    'total_items' => $paginator->total(),
                    'items' => $paginator->items(),
                ],
            ], $status);
        });
    }
}
