<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px; }
        .card { background: #fff; max-width: 480px; margin: auto; padding: 40px;
                border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .otp { font-size: 36px; font-weight: bold; letter-spacing: 8px;
               color: #1a56db; text-align: center; padding: 24px 0; }
        .warning { color: #dc2626; font-size: 13px; margin-top: 16px; }
        .footer { color: #9ca3af; font-size: 12px; margin-top: 32px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Afya HMS — Verification Code</h2>
        <p>Your one-time code for <strong>{{ $purpose }}</strong>:</p>

        <div class="otp">{{ $otp }}</div>

        <p>This code expires in <strong>{{ $expiresInMinutes }} minutes</strong>.</p>

        <p class="warning">
            ⚠️ If you did not request this, secure your account immediately.
            Do not share this code with anyone.
        </p>

        <div class="footer">
            Afya HMS — Built for Kenya.<br>
            This is an automated message. Do not reply.
        </div>
    </div>
</body>
</html>