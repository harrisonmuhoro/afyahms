@extends('pdf.layout')

@section('title', 'Queue Throughput')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">QUEUE THROUGHPUT</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <div style="margin-bottom: 20px;">
        <table style="width: 100%; border: none;">
            <tr>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Total Processed</div>
                    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">{{ number_format($data['kpis']['total_processed'] ?? 0) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Avg Daily</div>
                    <div style="font-size: 18px; font-weight: bold;">{{ number_format($data['kpis']['avg_daily'] ?? 0, 1) }}</div>
                </td>
                <td style="border: 1px solid #e5e7eb; padding: 10px; background-color: #f9fafb; text-align: center;">
                    <div style="font-size: 10px; color: #6b7280; text-transform: uppercase;">Peak Day</div>
                    <div style="font-size: 18px; font-weight: bold; color: #059669;">{{ number_format($data['kpis']['peak_day_count'] ?? 0) }}</div>
                </td>
            </tr>
        </table>
    </div>
    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th class="text-right">Total Tickets</th>
                <th class="text-right">Served</th>
                <th class="text-right">Avg Service Time (min)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td class="text-right">{{ number_format($row['total'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['served'] ?? 0) }}</td>
                    <td class="text-right">{{ number_format($row['avg_service_time'] ?? 0, 1) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
