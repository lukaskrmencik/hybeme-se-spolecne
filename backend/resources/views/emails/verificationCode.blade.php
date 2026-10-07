{{-- Colours and font follow the app (frontend/utils/theme.ts). Tables and inline styles keep it intact in Gmail and Outlook. --}}
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Ověřovací kód</title>
</head>
<body style="margin:0; padding:0; background-color:#F5F7F2; font-family:Nunito, 'Segoe UI', Arial, sans-serif; color:#133F63;">
    {{-- Inbox preview line --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        Tvůj kód pro dokončení registrace je {{ $code }}. Platí {{ $validMinutes }} minut.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F7F2;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 4px 14px rgba(19,63,99,0.08);">
                    {{-- Green stripe from the logo --}}
                    <tr>
                        <td style="height:6px; background-color:#8BB53C; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:32px 32px 8px;">
                            <img src="{{ $message->embed(resource_path('images/email-logo.png')) }}" width="96" height="96" alt="Hýbeme se společně" style="display:block; width:96px; height:96px; border:0;">
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:8px 32px 0;">
                            <h1 style="margin:0; font-size:24px; line-height:30px; font-weight:900; color:#133F63;">Ověř svůj e-mail</h1>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:12px 32px 0;">
                            <p style="margin:0; font-size:15px; line-height:22px; font-weight:600; color:#5F7385;">
                                Ahoj {{ $userName }}, díky za registraci! Zadej v aplikaci tenhle kód a můžeš začít sbírat body.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:24px 32px 8px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F7E6; border:2px solid #E4F0C8; border-radius:14px;">
                                <tr>
                                    <td align="center" style="padding:16px 28px; font-size:36px; line-height:40px; font-weight:900; letter-spacing:10px; color:#52831A; font-family:Nunito, 'Segoe UI', Arial, sans-serif;">
                                        {{ $code }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:8px 32px 28px;">
                            <p style="margin:0; font-size:13px; line-height:18px; font-weight:800; color:#9AA9B5;">
                                Kód platí {{ $validMinutes }} minut.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px;">
                            <div style="height:1px; background-color:#E2E7DC; font-size:0; line-height:0;">&nbsp;</div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:20px 32px 28px;">
                            <p style="margin:0; font-size:12px; line-height:18px; font-weight:600; color:#5F7385;">
                                Pokud registrace do aplikace Hýbeme se společně nebyla od tebe, tenhle e-mail klidně ignoruj. Bez kódu se k účtu nikdo nedostane.
                            </p>
                        </td>
                    </tr>
                </table>
                <p style="margin:20px 0 0; font-size:12px; line-height:18px; font-weight:800; color:#9AA9B5;">
                    Hýbeme se společně · Objevuj Benátecko pěšky i na kole
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
