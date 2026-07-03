<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Response;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //custom responce macros

        //return response()->success(["user" => "lukas"],200);
        Response::macro('success', function ($data = [], $status = 200) {
            return Response::json([
                'status' => 'success',
                'status_code' => $status,
                'data' => $data,
            ], $status);
        });

        //return response()->error('Error message', 400);
        Response::macro('error', function ($message, $status = 400) {
            return Response::json([
                'status' => 'error',
                'status_code' => $status,
                'error_message' => $message,
            ], $status);
        });

        //$users = User::paginate(10);
        //return response()->pagination($users,200);
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
