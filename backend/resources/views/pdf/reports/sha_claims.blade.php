@extends('pdf.layout')

@section('title', 'SHA Claims')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">SHA CLAIMS REPORT</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Claims</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ number_format($data['kpis']['total_claims'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Value</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">Ksh {{ number_format($data['kpis']['total_value'] ?? 0, 2) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Approved</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">{{ number_format($data['kpis']['approved_count'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Claim Ref</th>
                <th>SHA No</th>
                <th>Patient</th>
                <th>Date</th>
                <th>Status</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td style="font-family: monospace;">{{ substr($row['claim_ref'] ?? $row['public_id'] ?? '', 0, 10) }}</td>
                    <td>{{ $row['sha_number'] ?? 'N/A' }}</td>
                    <td>{{ $row['patient_name'] }}</td>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ strtoupper($row['status']) }}</td>
                    <td class="text-right">{{ number_format($row['amount'] ?? 0, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
