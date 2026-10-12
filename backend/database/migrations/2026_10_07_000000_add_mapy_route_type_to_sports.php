<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sports', function (Blueprint $table) {
            $table->string('mapy_route_type', 20)->default('foot_fast')->after('comb_mult_4');
        });

        DB::table('sports')
            ->where(fn ($q) => $q->where('name', 'ILIKE', '%horsk%')->orWhere('name', 'ILIKE', '%mtb%'))
            ->update(['mapy_route_type' => 'bike_mountain']);
        DB::table('sports')
            ->where('mapy_route_type', 'foot_fast')
            ->where(fn ($q) => $q->where('name', 'ILIKE', '%kol%')->orWhere('name', 'ILIKE', '%cykl%'))
            ->update(['mapy_route_type' => 'bike_road']);
    }

    public function down(): void
    {
        Schema::table('sports', function (Blueprint $table) {
            $table->dropColumn('mapy_route_type');
        });
    }
};
