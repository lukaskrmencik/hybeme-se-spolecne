<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PlaceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VisitController;
use Illuminate\Support\Facades\Route;

Route::group(['prefix' => 'auth', 'middleware' => 'throttle:20,1'], function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('refresh', [AuthController::class, 'refresh']);
    Route::post('google', [AuthController::class, 'google']);
    Route::post('google/redirect', [AuthController::class, 'googleRedirect']);
    Route::post('verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('resend-code', [AuthController::class, 'resendVerificationCode']);
});

Route::get('users/leaderboard', [UserController::class, 'leaderboard']);
Route::get('users/leaderboard/weeks', [UserController::class, 'leaderboardWeeks']);

Route::group(['middleware' => 'auth:api'], function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::group(['prefix' => 'users'], function () {
        Route::get('{user}', [UserController::class, 'show']);
        Route::get('{user}/profile', [UserController::class, 'profile']);
        Route::patch('{user}', [UserController::class, 'update']);
        Route::patch('{user}/role', [UserController::class, 'updateRole']);
        Route::post('{user}/terms', [UserController::class, 'acceptTerms']);
        Route::post('{user}/avatar', [UserController::class, 'uploadAvatar']);
        Route::delete('{user}/avatar', [UserController::class, 'deleteAvatar']);
        Route::delete('{user}', [UserController::class, 'destroy']);
        Route::get('', [UserController::class, 'index']);
    });

    Route::group(['prefix' => 'places'], function () {
        Route::post('', [PlaceController::class, 'store']);
        Route::patch('{place}', [PlaceController::class, 'update']);
        Route::get('{place}', [PlaceController::class, 'show']);
        Route::get('', [PlaceController::class, 'index']);
        Route::post('{place}/photos', [PlaceController::class, 'uploadAdminPhoto']);
        Route::delete('photos/{placePhoto}', [PlaceController::class, 'deleteAdminPhoto']);
    });

    Route::group(['prefix' => 'sports'], function () {
        Route::post('', [SportController::class, 'store']);
        Route::patch('{sport}', [SportController::class, 'update']);
        Route::get('', [SportController::class, 'index']);
    });

    Route::group(['prefix' => 'visits'], function () {
        Route::post('', [VisitController::class, 'store']);
        Route::post('{visit}/photo', [VisitController::class, 'uploadPhoto']);
        Route::delete('/photo/{visitsPhoto}', [VisitController::class, 'deletePhoto']);
    });

    Route::post('reports', [ReportController::class, 'store'])->middleware('throttle:10,1');
    Route::get('reports', [ReportController::class, 'index']);
    Route::post('reports/{report}/resolve', [ReportController::class, 'resolve']);

    Route::get('photos', [VisitController::class, 'photos']);
});
