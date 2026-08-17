@extends('pdf.layout')

@section('title', 'Wait Times')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">WAIT TIMES</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Avg Wait Time</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ $data['kpis']['avg_wait_minutes'] ?? 0 }} min</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Max Wait Time</div>
                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">{{ $data['kpis']['max_wait_minutes'] ?? 0 }} min</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Within SLA</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">{{ $data['kpis']['within_sla_percent'] ?? 0 }}%</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Station</th>
                <th class="text-right">Avg Wait (min)</th>
                <th class="text-right">Max Wait (min)</th>
                <th class="text-right">Patients Served</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($row['date'])->format('Y-m-d') }}</td>
                    <td>{{ $row['station'] ?? 'N/A' }}</td>
                    <td class="text-right">{{ number_format($row['avg_wait'] ?? 0, 1) }}</td>
                    <td class="text-right">{{ number_format($row['max_wait'] ?? 0, 1) }}</td>
                    <td class="text-right">{{ number_format($row['count'] ?? 0) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
