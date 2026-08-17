@extends('pdf.layout')

@section('title', 'Outstanding Invoices')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">OUTSTANDING INVOICES</div>
    <div>Date: {{ \Carbon\Carbon::now()->format('Y-m-d') }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Outstanding</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">
                        Ksh {{ number_format($data['kpis']['total_outstanding'] ?? 0, 2) }}
                    </div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Invoices</div>
                    <div style="font-size: 18px; font-weight: bold;">
                        {{ number_format($data['kpis']['total_invoices'] ?? 0) }}
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
                <th>Status</th>
                <th class="text-right">Total Amount</th>
                <th class="text-right">Outstanding</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td style="font-family: monospace;">{{ substr($row['public_id'], 0, 8) }}</td>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ $row['patient_name'] }}</td>
                    <td>{{ strtoupper($row['status']) }}</td>
                    <td class="text-right">{{ number_format($row['total_amount'], 2) }}</td>
                    <td class="text-right">{{ number_format($row['outstanding_amount'] ?? ($row['total_amount'] - $row['paid_amount']), 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
