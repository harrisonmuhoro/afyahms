@extends('pdf.layout')

@section('title', 'Payments Collected')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">PAYMENTS COLLECTED</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Collected</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">
                        Ksh {{ number_format($data['kpis']['total_collected'] ?? 0, 2) }}
                    </div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Cash Collections</div>
                    <div style="font-size: 18px; font-weight: bold;">
                        Ksh {{ number_format($data['kpis']['cash_collected'] ?? 0, 2) }}
                    </div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Insurance Collections</div>
                    <div style="font-size: 18px; font-weight: bold;">
                        Ksh {{ number_format($data['kpis']['insurance_collected'] ?? 0, 2) }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Record ID</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Method</th>
                <th>Status</th>
                <th class="text-right">Amount Paid</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td style="font-family: monospace;">{{ substr($row['public_id'], 0, 8) }}</td>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ $row['patient_name'] }}</td>
                    <td>{{ ucfirst($row['payment_method'] ?? 'N/A') }}</td>
                    <td>{{ strtoupper($row['status']) }}</td>
                    <td class="text-right">{{ number_format($row['paid_amount'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
