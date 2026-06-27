<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\InventoryItem::insert([
            [
                'sku' => 'MED-001',
                'name' => 'Paracetamol 500mg',
                'category' => 'Analgesics',
                'unit' => 'Tablets',
                'quantity_on_hand' => 5000,
                'reorder_level' => 1000,
                'unit_cost' => 5.50,
                'expiry_date' => '2028-12-31',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'sku' => 'SURG-045',
                'name' => 'Surgical Masks (Box of 50)',
                'category' => 'PPE',
                'unit' => 'Boxes',
                'quantity_on_hand' => 120,
                'reorder_level' => 200, // Low stock
                'unit_cost' => 450.00,
                'expiry_date' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'sku' => 'MED-089',
                'name' => 'Amoxicillin 250mg',
                'category' => 'Antibiotics',
                'unit' => 'Capsules',
                'quantity_on_hand' => 0, // Out of stock
                'reorder_level' => 500,
                'unit_cost' => 15.00,
                'expiry_date' => '2025-06-30',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'sku' => 'LAB-102',
                'name' => 'Blood Collection Tubes',
                'category' => 'Consumables',
                'unit' => 'Tubes',
                'quantity_on_hand' => 1500,
                'reorder_level' => 500,
                'unit_cost' => 20.00,
                'expiry_date' => '2027-01-15',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
