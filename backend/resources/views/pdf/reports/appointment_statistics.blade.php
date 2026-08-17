@extends('pdf.layout')

@section('title', 'Appointment Statistics')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">APPOINTMENT STATISTICS</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Appointments</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ number_format($data['kpis']['total_appointments'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Attended</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">{{ number_format($data['kpis']['attended'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">No-Shows</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">{{ number_format($data['kpis']['no_shows'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Type</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ $row['patient_name'] }}</td>
                    <td>{{ $row['doctor_name'] ?? 'N/A' }}</td>
                    <td>{{ ucfirst($row['type'] ?? 'General') }}</td>
                    <td>{{ strtoupper($row['status']) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
