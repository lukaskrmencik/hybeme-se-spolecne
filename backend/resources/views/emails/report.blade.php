{{-- Same look as the verification e-mail (colours from frontend/utils/theme.ts). --}}
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Nahlášení</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F7F2; font-family:Nunito, 'Segoe UI', Arial, sans-serif; color:#133F63;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        {{ $label }}: {{ $report->reportedUser?->name }}. Zkontrolujte nahlášení v administraci.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F7F2;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #E2E7DC;">
                    <tr>
                        <td style="height:6px; background-color:#C2412D; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px 4px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="padding-right:12px;">
                                        <img src="{{ $message->embed(resource_path('images/email-logo.png')) }}" width="44" height="44" alt="Hýbeme se společně" style="display:block; width:44px; height:44px; border:0;">
                                    </td>
                                    <td>
                                        <div style="font-size:12px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#C2412D;">Nahlášení obsahu</div>
                                        <div style="font-size:20px; line-height:26px; font-weight:900; color:#133F63;">{{ $label }}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px 0;">
                            <p style="margin:0; font-size:15px; line-height:22px; font-weight:600; color:#5F7385;">
                                Obsah v aplikaci byl nahlášen jako nevhodný. Posuďte ho prosím v administraci.
                            </p>
                        </td>
                    </tr>

                    @if ($report->content_url && $report->type !== 'name')
                        <tr>
                            <td align="center" style="padding:20px 32px 0;">
                                <img src="{{ $report->content_url }}" width="240" alt="Nahlášená fotografie" style="display:block; width:240px; max-width:100%; height:auto; border-radius:10px; border:1px solid #E2E7DC;">
                            </td>
                        </tr>
                    @endif

                    <tr>
                        <td style="padding:20px 32px 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F7F2; border-radius:10px;">
                                <tr>
                                    <td style="padding:14px 16px; font-size:14px; line-height:22px; color:#133F63;">
                                        <strong>Nahlášený uživatel:</strong> {{ $report->reportedUser?->name }} ({{ $report->reportedUser?->email }})<br>
                                        @if ($report->type === 'name')
                                            <strong>Nahlášené jméno:</strong> {{ $report->content_text }}<br>
                                        @endif
                                        @if ($placeName)
                                            <strong>Místo:</strong> {{ $placeName }}<br>
                                        @endif
                                        <strong>Nahlášeno uživatelem:</strong> {{ $report->reporter?->name ?? 'neznámý uživatel' }}<br>
                                        @if ($report->note)
                                            <strong>Poznámka:</strong> {{ $report->note }}
                                        @endif
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:24px 32px 28px;">
                            <a href="{{ $adminUrl }}" style="display:inline-block; background-color:#133F63; color:#ffffff; font-size:15px; font-weight:800; text-decoration:none; padding:13px 24px; border-radius:10px;">Otevřít v administraci</a>
                        </td>
                    </tr>
                </table>
                <p style="margin:20px 0 0; font-size:12px; line-height:18px; font-weight:700; color:#9AA9B5;">
                    Tento e-mail dostávají správci aplikace Hýbeme se společně.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
