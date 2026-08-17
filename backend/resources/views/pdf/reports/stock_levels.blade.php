@extends('pdf.layout')

@section('title', 'Stock Levels')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">STOCK LEVELS</div>
    <div>Generated: {{ \Carbon\Carbon::now()->format('Y-m-d') }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Items</div>
                    <div style="font-size: 18px; font-weight: bold;">{{ number_format($data['kpis']['total_items'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Low Stock</div>
                    <div style="font-size: 18px; font-weight: bold; color: #d97706;">{{ number_format($data['kpis']['low_stock_count'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Out of Stock</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">{{ number_format($data['kpis']['out_of_stock_count'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th class="text-right">Qty in Stock</th>
                <th class="text-right">Reorder Level</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ ucfirst($row['category'] ?? 'General') }}</td>
                    <td class="text-right">{{ number_format($row['quantity'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['reorder_level'] ?? 0) }}</td>
                    <td>{{ strtoupper($row['status'] ?? 'OK') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
