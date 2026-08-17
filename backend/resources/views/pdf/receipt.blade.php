@extends('pdf.layout')

@section('title', 'Receipt - ' . $bill->public_id)

@section('header_right')
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">RECEIPT</div>
    <div>Date: {{ $bill->cleared_at ? $bill->cleared_at->format('Y-m-d') : ($bill->created_at ? $bill->created_at->format('Y-m-d') : 'N/A') }}</div>
    <div>Receipt No: {{ substr($bill->public_id, 0, 8) }}</div>
@endsection

@section('content')
    <table style="margin-bottom: 30px;">
        <tr>
            <td style="border: none; padding: 0;">
                <strong>Billed To:</strong><br>
                {{ $bill->patient->fullName() }}<br>
                Patient No: {{ $bill->patient->patient_number }}<br>
                DOB: {{ $bill->patient->date_of_birth ? $bill->patient->date_of_birth->format('Y-m-d') : 'N/A' }}
            </td>
            <td style="border: none; padding: 0; text-align: right;">
                <strong>Payment Details:</strong><br>
                Method: {{ ucfirst($bill->payment_method ?? 'Cash') }}<br>
                Status: {{ strtoupper($bill->status) }}
            </td>
        </tr>
    </table>

    <table class="table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Category</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($bill->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td>{{ ucfirst($item->category) }}</td>
                    <td class="text-right">{{ $item->quantity }}</td>
                    <td class="text-right">{{ number_format($item->unit_price, 2) }}</td>
                    <td class="text-right">{{ number_format($item->total_price, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table style="width: 50%; float: right; margin-top: 20px;">
        <tr>
            <td style="border: none; text-align: right; font-weight: bold;">Sub Total:</td>
            <td style="border: none; text-align: right;">{{ number_format($bill->total_amount, 2) }}</td>
        </tr>
        <tr>
            <td style="border: none; text-align: right; font-weight: bold;">Amount Paid:</td>
            <td style="border: none; text-align: right;">{{ number_format($bill->paid_amount, 2) }}</td>
        </tr>
        <tr>
            <td style="border: none; text-align: right; font-weight: bold; border-top: 1px solid #333; padding-top: 5px;">Balance Due:</td>
            <td style="border: none; text-align: right; font-weight: bold; border-top: 1px solid #333; padding-top: 5px;">{{ number_format($bill->total_amount - $bill->paid_amount, 2) }}</td>
        </tr>
    </table>
    
    <div style="clear: both;"></div>

    @if($bill->status === 'waived')
        <div style="position: absolute; top: 40%; left: 20%; font-size: 80px; color: rgba(239, 68, 68, 0.1); transform: rotate(-45deg); font-weight: bold; pointer-events: none;">
            WAIVED
        </div>
    @endif
    
    @if($bill->status === 'cleared')
        <div style="position: absolute; top: 40%; left: 20%; font-size: 80px; color: rgba(16, 185, 129, 0.1); transform: rotate(-45deg); font-weight: bold; pointer-events: none;">
            CLEARED
        </div>
    @endif
@endsection
