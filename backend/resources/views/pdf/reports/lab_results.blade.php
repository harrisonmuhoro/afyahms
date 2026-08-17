@extends('pdf.layout')

@section('title', 'Lab Results')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">LAB RESULTS (REPORT)</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Tests</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">
                        {{ number_format($data['kpis']['total_tests'] ?? 0) }}
                    </div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Completed</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">
                        {{ number_format($data['kpis']['completed_tests'] ?? 0) }}
                    </div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Pending</div>
                    <div style="font-size: 18px; font-weight: bold; color: #d97706;">
                        {{ number_format($data['kpis']['pending_tests'] ?? 0) }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Test ID</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Test Name</th>
                <th>Status</th>
                <th>Priority</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td style="font-family: monospace;">{{ substr($row['public_id'] ?? '', 0, 8) }}</td>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ $row['patient_name'] }}</td>
                    <td>{{ $row['test_name'] }}</td>
                    <td>{{ strtoupper($row['status']) }}</td>
                    <td>{{ ucfirst($row['priority'] ?? 'Routine') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
