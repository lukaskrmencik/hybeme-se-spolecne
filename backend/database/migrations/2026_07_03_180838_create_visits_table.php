<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->integer('reward');
            $table->bigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users');
            $table->bigInteger('place_id');
            $table->foreign('place_id')->references('id')->on('places');
            $table->bigInteger('sport_id');
            $table->foreign('sport_id')->references('id')->on('sports');
            $table->boolean('is_combination');
            $table->timestampTz('timestamp');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
