<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->only(['email', 'password']);

        if (! $token = auth('api')->attempt($credentials)) {
            return response()->error('Neplatné přihlašovací údaje', 401);
        }

        return response()->success(["token" => $token]);
    }

    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                'confirmed',
                'max:255',
                Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers(),
            ],
        ]);

        $user = User::create([
            'name' => $validatedData['name'],
            'email' => $validatedData['email'],
            'password' => Hash::make($validatedData['password']),
        ]);

        $token = auth('api')->login($user);

        return response()->success(["token" => $token]);
    }

    public function refresh()
    {
        try {
            $newToken = auth('api')->refresh(true, true);
            return response()->success(["token" => $newToken]);

        } catch (\Exception $e) {
            return response()->error('Chyba tokenu, přihlašte se manuálně.', 401);
        }
    }

    public function logout()
    {
        auth('api')->logout();
        return response()->success(["message" => "Odhlášení proběhlo úspěšně."]);
    }

}
