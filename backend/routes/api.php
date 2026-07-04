<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PlaceController;
use App\Http\Controllers\SportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::group(['prefix' => 'auth'], function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('refresh', [AuthController::class, 'refresh']);
});

// Protected routes
Route::group(['middleware' => 'auth:api'], function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::group(['prefix' => 'users'], function () {
        Route::get('{user}', [UserController::class, 'show']);
        Route::patch('{user}', [UserController::class, 'update']);
        Route::post('{user}/avatar', [UserController::class, 'uploadAvatar']);
        Route::delete('{user}', [UserController::class, 'destroy']);
        Route::get('', [UserController::class, 'index']);
    });

    Route::group(['prefix' => 'places'], function () {
        Route::post('', [PlaceController::class, 'store']);
        Route::patch('{place}', [PlaceController::class, 'update']);
        Route::get('{place}', [PlaceController::class, 'show']);
        Route::get('', [PlaceController::class, 'index']);
        Route::post('{place}/image', [PlaceController::class, 'uploadImage']);
    });

    Route::group(['prefix' => 'sports'], function () {
        Route::post('', [SportController::class, 'store']);
        Route::patch('{sport}', [SportController::class, 'update']);
        Route::get('{sport}', [SportController::class, 'show']);
        Route::get('', [SportController::class, 'index']);
        Route::post('{sport}/icon', [SportController::class, 'uploadIcon']);
    });
});
