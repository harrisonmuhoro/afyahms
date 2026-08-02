<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Medication;
use App\Models\Prescription;
use App\Models\PrescriptionItem;

class PharmacyController extends Controller
{
    // --- Medications ---

    public function getMedications()
    {
        return response()->json(Medication::all());
    }

    public function storeMedication(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'dosage_form' => 'nullable|string',
            'strength' => 'nullable|string',
            'stock_quantity' => 'integer',
            'unit_price' => 'numeric',
            'is_active' => 'boolean'
        ]);

        $medication = Medication::create($validated);
        return response()->json($medication, 201);
    }

    // --- Prescriptions ---

    public function getPrescriptions()
    {
        $prescriptions = Prescription::with(['items.medication', 'doctor'])->get();
        return response()->json($prescriptions);
    }

    public function storePrescription(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|integer',
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.medication_id' => 'required|exists:medications,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.dosage_instructions' => 'required|string'
        ]);

        $prescription = Prescription::create([
            'patient_id' => $validated['patient_id'],
            'doctor_id' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending'
        ]);

        foreach ($validated['items'] as $item) {
            PrescriptionItem::create([
                'prescription_id' => $prescription->id,
                'medication_id' => $item['medication_id'],
                'quantity' => $item['quantity'],
                'dosage_instructions' => $item['dosage_instructions']
            ]);
        }

        return response()->json($prescription->load('items'), 201);
    }

    public function updatePrescriptionStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:dispensed'
        ]);

        $prescription = Prescription::with(['items.medication'])->findOrFail($id);
        if ($prescription->status !== 'pending') {
            abort(409, 'Only pending prescriptions can be dispensed.');
        }

        DB::transaction(function () use ($prescription): void {
            $prescription->update(['status' => 'dispensed']);

            foreach ($prescription->items as $item) {
                $medication = $item->medication;
                $medication->decrement('stock_quantity', $item->quantity);
                
                // Trigger Low Stock Alert if stock is <= 20
                $medication->refresh();
                if ($medication->stock_quantity <= 20) {
                    $pharmacists = \App\Models\User::role('pharmacist')->get();
                    if ($pharmacists->isNotEmpty()) {
                        \Illuminate\Support\Facades\Notification::send($pharmacists, new \App\Notifications\LowStockAlert($medication));
                    }
                }
            }
        });

        return response()->json($prescription->fresh(['items.medication', 'doctor']));
    }
}
