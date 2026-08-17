@extends('pdf.layout')

@section('title', 'Stock Consumption')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">STOCK CONSUMPTION</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Dispensed</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ number_format($data['kpis']['total_dispensed'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Cost</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">Ksh {{ number_format($data['kpis']['total_cost'] ?? 0, 2) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th class="text-right">Qty Consumed</th>
                <th class="text-right">Unit Cost</th>
                <th class="text-right">Total Cost</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ ucfirst($row['category'] ?? 'General') }}</td>
                    <td class="text-right">{{ number_format($row['quantity'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['unit_cost'] ?? 0, 2) }}</td>
                    <td class="text-right">{{ number_format($row['total_cost'] ?? 0, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
