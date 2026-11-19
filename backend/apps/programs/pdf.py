"""Program PDF rendering (WeasyPrint, A4, black & white friendly, RTL Persian).

The font is registered twice so the glyphs are always embedded:

* ``@font-face`` inside the generated HTML, pointing at the real TTF file, and
* fontconfig (the Docker images copy ``backend/fonts`` into a system font
  directory and run ``fc-cache``) as a fallback for Pango text shaping.

Keep every user facing string of the footer in :data:`PDF_FOOTER_TEXT` so the
brand slogan can never drift between pages.
"""

import base64
import io
import logging
from pathlib import Path

from django.conf import settings
from django.utils.html import escape

from apps.athletes.models import Athlete
from apps.core.utils_jalali import gregorian_to_jalali_str

logger = logging.getLogger(__name__)

PDF_FONT_FAMILY = 'Sahel FD'
PDF_BRAND = 'Physique'
PDF_SLOGAN = 'قدرت از انضباط شروع می‌شود'
PDF_FOOTER_TEXT = f'{PDF_BRAND} | {PDF_SLOGAN}'
PDF_COLUMNS_CLASS = 'days-grid'

_PERSIAN_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
LEVEL_LABELS = dict(Athlete.LEVEL_CHOICES)


def fa(value):
    """Convert latin digits to Persian digits (leaves other characters alone)."""
    if value is None:
        return ''
    return str(value).translate(_PERSIAN_DIGITS)


def _path(*parts) -> Path:
    return Path(settings.BASE_DIR).joinpath(*parts)


def font_path() -> Path:
    return _path('fonts', 'Sahel-FD.ttf')


def bold_font_path() -> Path:
    return _path('fonts', 'Sahel-Bold-FD.ttf')


def logo_path() -> Path:
    return _path('assets', 'brand', 'logo-light.svg')


def _file_uri(path: Path) -> str:
    return path.resolve().as_uri()


def qr_data_uri(value: str) -> str:
    """PNG data-uri QR code (segno is pure Python, no Pillow needed)."""
    import segno

    buffer = io.BytesIO()
    segno.make(value, error='m').save(buffer, kind='png', scale=4, border=2)
    encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
    return f'data:image/png;base64,{encoded}'


def superset_labels(items):
    """``[None, None, 'A1', 'A2', ...]`` for one day's items (ordered)."""
    labels = []
    letters = {}
    count = -1
    for item in items:
        group = item.superset_group
        if group is None:
            labels.append(None)
            continue
        if group not in letters:
            count += 1
            letters[group] = chr(65 + (count % 26))
        index = sum(1 for label in labels if label and label.startswith(letters[group]))
        labels.append(f'{letters[group]}{index + 1}')
    return labels

def _styles() -> str:
    """Inline stylesheet: A4, RTL, Sahel FD, two columns, B/W table."""
    regular = _file_uri(font_path())
    bold = _file_uri(bold_font_path())
    footer = escape(PDF_FOOTER_TEXT)
    return f"""
@font-face {{ font-family: '{PDF_FONT_FAMILY}'; src: url('{regular}') format('truetype'); font-weight: normal; }}
@font-face {{ font-family: '{PDF_FONT_FAMILY}'; src: url('{bold}') format('truetype'); font-weight: bold; }}
@page {{
  size: A4;
  margin: 12mm 10mm 14mm 10mm;
  @bottom-center {{
    content: '{footer}';
    font-family: '{PDF_FONT_FAMILY}';
    font-size: 7.5pt;
    color: #111;
    padding-top: 2mm;
    border-top: 0.4pt solid #111;
  }}
}}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; background: #fff; color: #000; }}
body {{ font-family: '{PDF_FONT_FAMILY}', sans-serif; direction: rtl; font-size: 9pt; line-height: 1.55; }}
.doc-head {{ border: 0.8pt solid #111; padding: 4mm; margin-bottom: 4mm; }}
.doc-head-top {{ display: flex; align-items: flex-start; justify-content: space-between; direction: ltr; }}
.doc-brand {{ display: flex; align-items: center; gap: 2mm; }}
.doc-brand img {{ width: 26mm; height: auto; }}
.doc-brand span {{ font-size: 13pt; font-weight: bold; letter-spacing: 0.5pt; }}
.doc-qr {{ text-align: center; }}
.doc-qr img {{ width: 20mm; height: 20mm; }}
.doc-qr span {{ display: block; font-size: 6.5pt; color: #333; }}
.doc-title {{ font-size: 14pt; font-weight: bold; margin: 2mm 0 3mm; }}
.meta {{ display: flex; flex-wrap: wrap; gap: 0 5mm; }}
.meta-item {{ min-width: 30mm; margin-bottom: 1.5mm; }}
.meta-label {{ display: block; font-size: 7pt; color: #444; }}
.meta-value {{ display: block; font-size: 9pt; font-weight: bold; }}
.days-grid {{ column-count: 2; column-gap: 6mm; }}
.day {{ break-inside: avoid; page-break-inside: avoid; margin: 0 0 4mm; }}
.day-title {{ font-size: 9.5pt; font-weight: bold; margin: 0 0 1.5mm; padding: 1.2mm 2mm; border: 0.6pt solid #111; background: #efefef; }}
.day-title span {{ font-weight: normal; font-size: 8pt; }}
.day-empty {{ font-size: 8pt; color: #444; margin: 0 0 3mm; }}
table.day-table {{ width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.4pt; }}
table.day-table th, table.day-table td {{ border: 0.5pt solid #666; padding: 1mm 1.2mm; text-align: right; vertical-align: top; }}
table.day-table th {{ background: #e6e6e6; font-weight: bold; }}
table.day-table .c-tag {{ width: 9mm; text-align: center; font-weight: bold; }}
table.day-table .c-row {{ width: 6mm; text-align: center; }}
table.day-table .c-sets {{ width: 15mm; text-align: center; }}
table.day-table .c-rest {{ width: 13mm; text-align: center; }}
table.day-table tr.superset td.c-tag {{ border-right: 1.4pt solid #111; }}
table.day-table tr.superset td {{ background: #f7f7f7; }}
table.day-table tr.group-row td {{ background: #dedede; font-weight: bold; text-align: right; }}
.summary {{ font-size: 8pt; color: #222; margin: 0 0 3mm; }}
"""


def _note_html(value: str) -> str:
    return escape(value).replace('\n', '<br>')


def _day_html(day) -> str:
    items = sorted(day.items.all(), key=lambda item: (item.order, item.id))
    heading = f'روز {fa(day.day_index)}'
    if day.label:
        heading += f' <span>{escape(day.label)}</span>'
    if not items:
        return (
            f'<section class="day"><h2 class="day-title">{heading}</h2>'
            '<p class="day-empty">برای این روز حرکتی ثبت نشده است.</p></section>'
        )

    labels = superset_labels(items)
    rows = []
    previous_group = None
    group_letter = ''
    for number, (item, tag) in enumerate(zip(items, labels), start=1):
        group = item.superset_group
        if group is not None and group != previous_group:
            group_letter = tag[0] if tag else ''
            rows.append(
                f'<tr class="group-row"><td colspan="6">سوپرست {escape(group_letter)}</td></tr>'
            )
        previous_group = group
        css = ' class="superset"' if group is not None else ''
        rest = f'{fa(item.rest_seconds)} ثانیه' if item.rest_seconds else '—'
        rows.append(
            f'<tr{css}>'
            f'<td class="c-tag">{escape(tag or "")}</td>'
            f'<td class="c-row">{fa(number)}</td>'
            f'<td>{escape(item.exercise_name_snapshot or item.exercise.name)}</td>'
            f'<td class="c-sets">{fa(item.sets)} / {fa(item.reps)}</td>'
            f'<td class="c-rest">{rest}</td>'
            f'<td>{_note_html(item.note) if item.note else "—"}</td>'
            '</tr>'
        )

    return (
        '<section class="day">'
        f'<h2 class="day-title">{heading}</h2>'
        '<table class="day-table">'
        '<colgroup><col class="c-tag"><col class="c-row"><col><col class="c-sets">'
        '<col class="c-rest"><col></colgroup>'
        '<thead><tr><th class="c-tag">سوپرست</th><th class="c-row">#</th><th>حرکت</th>'
        '<th class="c-sets">ست / تکرار</th><th class="c-rest">استراحت</th><th>یادداشت</th></tr></thead>'
        f'<tbody>{"".join(rows)}</tbody>'
        '</table></section>'
    )



def _meta_item(label: str, value: str) -> str:
    return (
        f'<div class="meta-item"><span class="meta-label">{escape(label)}</span>'
        f'<span class="meta-value">{value}</span></div>'
    )


def _header_html(program, share_url: str) -> str:
    athlete = program.athlete
    coach_name = program.coach.get_full_name() or program.coach.get_username()
    level = LEVEL_LABELS.get(athlete.level, athlete.level or '')
    logo = _file_uri(logo_path()) if logo_path().exists() else ''
    logo_html = f'<img src="{logo}" alt="Physique">' if logo else ''
    meta = ''.join([
        _meta_item('ورزشکار', escape(f'{athlete.first_name} {athlete.last_name}'.strip())),
        _meta_item('کد', fa(athlete.unique_code)),
        _meta_item('سطح', escape(level)),
        _meta_item('مربی', escape(coach_name)),
        _meta_item('تاریخ شروع', fa(gregorian_to_jalali_str(program.start_date))),
        _meta_item('برنامه شماره', fa(program.sequence_number)),
    ])
    qr_html = ''
    if share_url:
        qr_html = (
            f'<div class="doc-qr"><img src="{qr_data_uri(share_url)}" alt="QR">'
            '<span>اسکن برای مشاهده آنلاین</span></div>'
        )
    return (
        '<header class="doc-head">'
        '<div class="doc-head-top">'
        f'<div class="doc-brand">{logo_html}<span>{PDF_BRAND}</span></div>'
        f'{qr_html}'
        '</div>'
        f'<h1 class="doc-title">برنامه تمرینی «{escape(program.title)}»</h1>'
        f'<div class="meta">{meta}</div>'
        '</header>'
    )


def build_html(program, share_url: str = '') -> str:
    """Full HTML document for WeasyPrint (RTL, two-column day grid)."""
    days = list(program.days.all())
    total_items = sum(len(day.items.all()) for day in days)
    summary = (
        f'<p class="summary">تعداد روزهای تمرین: {fa(len(days))} • '
        f'مجموع حرکات: {fa(total_items)}</p>'
    )
    body = ''.join(_day_html(day) for day in days)
    empty = '<p class="day-empty">هنوز روزی برای این برنامه ثبت نشده است.</p>'
    return (
        '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">'
        f'<title>Physique — برنامه {fa(program.sequence_number)}</title>'
        f'<style>{_styles()}</style></head><body>'
        f'{_header_html(program, share_url)}'
        f'{summary}'
        f'<div class="{PDF_COLUMNS_CLASS}">{body or empty}</div>'
        '</body></html>'
    )


def render_pdf(program, share_url: str = '', uncompressed_pdf: bool = False) -> bytes:
    """Return the PDF bytes; raises with a readable message when it cannot."""
    missing = [str(path) for path in (font_path(), bold_font_path()) if not path.exists()]
    if missing:
        raise FileNotFoundError(f'قلم فارسی یافت نشد: {", ".join(missing)}')
    from weasyprint import HTML

    html = build_html(program, share_url)
    logger.debug('rendering program %s pdf (%s bytes of html)', program.pk, len(html))
    return HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf(
        uncompressed_pdf=uncompressed_pdf
    )

