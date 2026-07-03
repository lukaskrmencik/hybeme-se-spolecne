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

        Schema::create('cheats', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('visit_id');
            $table->foreign('visit_id')->references('id')->on('visits');
            $table->bigInteger('visit_id_2')->nullable();
            $table->foreign('visit_id_2')->references('id')->on('visits');
            $table->text('user_message')->nullable();
            $table->boolean('is_denied');
            $table->text('cheat_description');
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cheats');
    }
};
