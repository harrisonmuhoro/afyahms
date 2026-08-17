@extends('pdf.layout')

@section('title', 'Diagnoses Summary')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">DIAGNOSES SUMMARY</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Diagnoses</div>
                    <div style="font-size: 18px; font-weight: bold; color: #7c3aed;">{{ number_format($data['kpis']['total_diagnoses'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Unique Conditions</div>
                    <div style="font-size: 18px; font-weight: bold;">{{ number_format($data['kpis']['unique_conditions'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Diagnosis</th>
                <th>ICD Code</th>
                <th class="text-right">Cases</th>
                <th class="text-right">% of Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ $row['diagnosis'] ?? $row['name'] ?? 'Unknown' }}</td>
                    <td style="font-family: monospace;">{{ $row['icd_code'] ?? 'N/A' }}</td>
                    <td class="text-right">{{ number_format($row['count'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['percentage'] ?? 0, 1) }}%</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
