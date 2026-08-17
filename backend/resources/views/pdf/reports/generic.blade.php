@extends('pdf.layout')

@section('title', 'Report')

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">REPORT</div>
    <div>Period: {{ $filters['from'] ?? 'All Time' }} to {{ $filters['to'] ?? 'All Time' }}</div>
@endsection

@section('content')
    <table class="table">
        <thead>
            <tr>
                @foreach(array_keys($data['table_data'][0] ?? []) as $key)
                    <th>{{ ucwords(str_replace('_', ' ', $key)) }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($data['table_data'] as $row)
                <tr>
                    @foreach($row as $key => $value)
                        <td>{{ $value }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
@endsection
