@extends('pdf.layout')

@section('title', 'Expiring Items')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">EXPIRING ITEMS</div>
    <div>Window: Next {{ $filters['window'] ?? 30 }} days | Generated: {{ \Carbon\Carbon::now()->format('Y-m-d') }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Items Expiring</div>
                    <div style="font-size: 18px; font-weight: bold; color: #d97706;">{{ number_format($data['kpis']['expiring_count'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Already Expired</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">{{ number_format($data['kpis']['expired_count'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Estimated Loss</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">Ksh {{ number_format($data['kpis']['estimated_loss'] ?? 0, 2) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Batch No</th>
                <th>Expiry Date</th>
                <th class="text-right">Qty</th>
                <th>Days Remaining</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ $row['name'] }}</td>
                    <td style="font-family: monospace;">{{ $row['batch_number'] ?? 'N/A' }}</td>
                    <td>{{ $row['expiry_date'] ?? 'N/A' }}</td>
                    <td class="text-right">{{ number_format($row['quantity'] ?? 0) }}</td>
                    <td>{{ $row['days_remaining'] ?? 'Expired' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
