@extends('pdf.layout')

@section('title', 'Prescriptions Issued')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">PRESCRIPTIONS ISSUED</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Prescriptions</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ number_format($data['kpis']['total_prescriptions'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Dispensed</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">{{ number_format($data['kpis']['dispensed'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Pending</div>
                    <div style="font-size: 18px; font-weight: bold; color: #d97706;">{{ number_format($data['kpis']['pending'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Drug</th>
                <th>Dosage</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ $row['patient_name'] }}</td>
                    <td>{{ $row['drug_name'] ?? $row['medication'] ?? 'N/A' }}</td>
                    <td>{{ $row['dosage'] ?? 'N/A' }}</td>
                    <td>{{ strtoupper($row['status']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
