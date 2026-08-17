@extends('pdf.layout')

@section('title', 'Patient Volume')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">PATIENT VOLUME</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Visits</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ number_format($data['kpis']['total_visits'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">New Patients</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">{{ number_format($data['kpis']['new_patients'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Returning Patients</div>
                    <div style="font-size: 18px; font-weight: bold;">{{ number_format($data['kpis']['returning_patients'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th class="text-right">Total Visits</th>
                <th class="text-right">New</th>
                <th class="text-right">Returning</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['chart_data'] ?? [] as $row)
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td class="text-right">{{ number_format($row['count'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['new'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['returning'] ?? 0) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
