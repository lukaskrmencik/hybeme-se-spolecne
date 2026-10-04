Nahlášení obsahu: {{ $label }}

Nahlášený uživatel: {{ $report->reportedUser?->name }} ({{ $report->reportedUser?->email }})
@if ($report->type === 'name')
Nahlášené jméno: {{ $report->content_text }}
@endif
@if ($placeName)
Místo: {{ $placeName }}
@endif
Nahlášeno uživatelem: {{ $report->reporter?->name ?? 'neznámý uživatel' }}
@if ($report->note)
Poznámka: {{ $report->note }}
@endif

Posuďte prosím nahlášení v administraci: {{ $adminUrl }}
