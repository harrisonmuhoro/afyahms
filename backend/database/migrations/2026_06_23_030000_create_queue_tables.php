<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Queue module tables per docs/10-database-erd.md and docs/17-queue-management-design.md.
 *
 * Tables:
 *  - queue_stations:   per-branch station definitions (REC/TRI/DOC/LAB/PHA/BIL/RAD)
 *  - queue_tickets:    issued tickets; daily-reset sequence per (branch, station, date)
 *  - queue_events:     append-only ledger of state transitions
 *  - visits:           the patient journey chain (links patient → appointment → tickets → encounter)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────────────────────────────────
        // visits
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('visits', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('appointment_id')->nullable();
            $table->unsignedBigInteger('encounter_id')->nullable();
            $table->date('visit_date');
            $table->enum('visit_type', ['walk_in', 'appointment', 'referral', 'follow_up', 'emergency'])
                ->default('walk_in');
            $table->enum('status', ['open', 'in_progress', 'completed', 'cancelled'])
                ->default('open');
            $table->string('current_department', 8)->nullable();   // REC|TRI|DOC|LAB|PHA|BIL|RAD
            $table->unsignedBigInteger('registered_by')->nullable();
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            // $table->foreign('appointment_id')->references('id')->on('appointments')->nullOnDelete();
            // ^ FK added in a follow-up migration when the appointments table exists.
            $table->foreign('registered_by')->references('id')->on('users')->nullOnDelete();
            // $table->foreign('current_department')->references('code')->on('queue_stations')->nullOnDelete();
            // ^ FK added in a follow-up migration; current_department is a string code,
            //   enforced at the application layer (VisitService) until stations exist.

            $table->index(['branch_id', 'visit_date']);
            $table->index(['branch_id', 'status']);
            $table->index(['patient_id', 'visit_date']);
        });

        // ─────────────────────────────────────────────────────────────────────
        // queue_stations
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('queue_stations', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('branch_id');
            $table->string('code', 8);                  // REC|TRI|DOC|LAB|PHA|BIL|RAD
            $table->string('name', 80);
            $table->enum('station_type', [
                'reception', 'triage', 'doctor', 'laboratory',
                'pharmacy', 'billing', 'radiology',
            ]);
            $table->unsignedSmallInteger('pipeline_order');
            $table->boolean('is_active')->default(true);
            $table->enum('status', ['open', 'serving', 'paused', 'closed'])->default('open');
            $table->unsignedBigInteger('assigned_user_id')->nullable();
            $table->timestamps();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('assigned_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['branch_id', 'code'], 'queue_stations_branch_code_unique');
            $table->index(['branch_id', 'pipeline_order']);
        });

        // ─────────────────────────────────────────────────────────────────────
        // queue_tickets
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('queue_tickets', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->uuid('public_id')->unique();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('visit_id');
            $table->unsignedBigInteger('station_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('encounter_id')->nullable();
            $table->unsignedBigInteger('appointment_id')->nullable();
            $table->string('ticket_number', 16);         // e.g. 'TRI-014'
            $table->unsignedSmallInteger('sequence_value');
            $table->date('ticket_date');
            $table->enum('priority', ['normal', 'priority', 'emergency'])->default('normal');
            $table->enum('mts_category', ['red', 'orange', 'yellow', 'green', 'blue'])->nullable();
            $table->enum('state', [
                'issued', 'waiting', 'called', 'in_service',
                'held', 'completed', 'no_show', 'transferred', 'cancelled',
            ])->default('issued');
            $table->unsignedBigInteger('served_by')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('served_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('visit_id')->references('id')->on('visits')->cascadeOnDelete();
            $table->foreign('station_id')->references('id')->on('queue_stations')->restrictOnDelete();
            $table->foreign('patient_id')->references('id')->on('patients')->restrictOnDelete();
            $table->foreign('served_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(
                ['branch_id', 'station_id', 'ticket_date', 'ticket_number'],
                'queue_tickets_unique_daily'
            );
            $table->index(['branch_id', 'ticket_date', 'state']);
            $table->index(['station_id', 'state', 'priority']);
            $table->index(['visit_id', 'state']);
        });

        // ─────────────────────────────────────────────────────────────────────
        // queue_events — append-only state-transition ledger
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('queue_events', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('queue_ticket_id');
            $table->unsignedBigInteger('station_id');
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->enum('event_type', [
                'issued', 'called', 'recalled', 'served_start',
                'held', 'resumed', 'advanced', 'completed',
                'no_show', 'transferred', 'cancelled',
                'preempted', 'reranked',
            ]);
            $table->string('from_state', 32)->nullable();
            $table->string('to_state', 32)->nullable();
            $table->enum('mts_category', ['red', 'orange', 'yellow', 'green', 'blue'])->nullable();
            $table->string('reason', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->useCurrent();

            $table->foreign('branch_id')->references('id')->on('branches')->restrictOnDelete();
            $table->foreign('queue_ticket_id')->references('id')->on('queue_tickets')->cascadeOnDelete();
            $table->foreign('station_id')->references('id')->on('queue_stations')->restrictOnDelete();
            $table->foreign('actor_user_id')->references('id')->on('users')->nullOnDelete();

            $table->index(['branch_id', 'occurred_at']);
            $table->index(['queue_ticket_id', 'occurred_at']);
            $table->index(['event_type', 'occurred_at']);
        });

        // visits.encounter_id (forward reference — encounter module creates table later)
        Schema::table('visits', function (Blueprint $table): void {
            // Encounters table may not exist yet (deferred module). We skip the FK and add later.
            if (! Schema::hasColumn('visits', 'encounter_id')) {
                return;
            }
        });

        // queue_tickets FK to encounters (deferred — encounters module not built yet)
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_events');
        Schema::dropIfExists('queue_tickets');
        Schema::dropIfExists('queue_stations');
        Schema::dropIfExists('visits');
    }
};
