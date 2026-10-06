<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sports', function (Blueprint $table) {
            // Mapy.com route planning used by the "Navigovat" button: foot_fast, foot_hiking, bike_road, bike_mountain.
            $table->string('mapy_route_type', 20)->default('foot_fast')->after('comb_mult_4');
        });

        // Existing sports get a sensible guess from their name; admins can change it.
        DB::table('sports')
            ->where(fn ($q) => $q->where('name', 'ILIKE', '%horsk%')->orWhere('name', 'ILIKE', '%mtb%'))
            ->update(['mapy_route_type' => 'bike_mountain']);
        DB::table('sports')
            ->where('mapy_route_type', 'foot_fast')
            ->where(fn ($q) => $q->where('name', 'ILIKE', '%kol%')->orWhere('name', 'ILIKE', '%cykl%'))
            ->update(['mapy_route_type' => 'bike_road']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sports', function (Blueprint $table) {
            $table->dropColumn('mapy_route_type');
        });
    }
};
