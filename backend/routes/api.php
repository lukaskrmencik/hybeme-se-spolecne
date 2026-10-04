<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheatController;
use App\Http\Controllers\PlaceController;
use App\Http\Controllers\SportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VisitController;
use Illuminate\Support\Facades\Route;

// Public routes
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

    Route::group(['prefix' => 'visits'], function () {
        Route::post('', [VisitController::class, 'store']);
        Route::get('', [VisitController::class, 'index']);
        Route::get('{visit}', [VisitController::class, 'show']);
        Route::post('{visit}/photo', [VisitController::class, 'uploadPhoto']);
        Route::delete('/photo/{visitsPhoto}', [VisitController::class, 'deletePhoto']);
    });

    // Admin: every visit photo with filters (deleting is visits/photo/{id}).
    Route::get('photos', [VisitController::class, 'photos']);

    Route::group(['prefix' => 'cheats'], function () {
        Route::get('', [CheatController::class, 'index']);
        Route::get('{cheat}', [CheatController::class, 'show']);
        Route::post('{cheat}/deny', [CheatController::class, 'denyCheat']);
        Route::post('{cheat}/message', [CheatController::class, 'messageAdmin']);
    });
});
