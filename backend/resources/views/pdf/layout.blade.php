<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title')</title>
    <style>
        /* Base typography & resets for DomPDF */
        body {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .header {
            border-bottom: 2px solid {{ $hospital['primary_color'] ?? '#0F766E' }};
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .hospital-name {
            font-size: 24px;
            font-weight: bold;
            color: {{ $hospital['primary_color'] ?? '#0F766E' }};
            margin: 0;
        }
        
        .hospital-details {
            font-size: 11px;
            color: #666;
            margin-top: 5px;
        }

        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            text-transform: uppercase;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: bold;
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #d1d5db;
        }
        
        td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
            color: #4b5563;
        }

        tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        
        /* Footer */
        .footer {
            position: fixed;
            bottom: 0px;
            left: 0px;
            right: 0px;
            height: 30px;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
            font-size: 10px;
            color: #9ca3af;
        }

        .page-number:after { content: counter(page); }
    </style>
    @yield('styles')
</head>
<body>
    <div class="header">
        <table style="margin-bottom: 0;">
            <tr>
                <td style="border: none; padding: 0;">
                    <h1 class="hospital-name">{{ $hospital['name'] ?? 'Afya HMS' }}</h1>
                    <div class="hospital-details">
                        {{ $hospital['address'] ?? 'Nairobi, Kenya' }}<br>
                        Tel: {{ $hospital['phone'] ?? '+254' }} | Email: {{ $hospital['email'] ?? 'info@hospital' }}
                    </div>
                </td>
                <td style="border: none; padding: 0; text-align: right; vertical-align: top;">
                    @yield('header_right')
                </td>
            </tr>
        </table>
    </div>

    <div class="content">
        @yield('content')
    </div>

    <div class="footer">
        <table style="margin-bottom: 0;">
            <tr>
                <td style="border: none; padding: 0;">
                    Generated on {{ \Carbon\Carbon::now()->format('Y-m-d H:i') }}
                </td>
                <td style="border: none; padding: 0; text-align: right;">
                    Page <span class="page-number"></span>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
