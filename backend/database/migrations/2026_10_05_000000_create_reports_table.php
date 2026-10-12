<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 20);
            $table->foreignId('reported_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('visits_photo_id')->nullable()->constrained('visits_photos')->nullOnDelete();
            $table->text('content_url')->nullable();
            $table->string('content_text')->nullable();
            $table->text('note')->nullable();
            $table->string('status', 20)->default('open');
            $table->string('resolution', 30)->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'type', 'reported_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
