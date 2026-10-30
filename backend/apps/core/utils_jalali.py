import jdatetime
from datetime import date


def gregorian_to_jalali_str(d):
    if not d:
        return ''
    if isinstance(d, str):
        try:
            d = date.fromisoformat(d)
        except:
            return d
    try:
        jd = jdatetime.date.fromgregorian(date=d)
        months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
        return f'{jd.day} {months[jd.month]} {jd.year}'
    except Exception:
        return str(d)


def gregorian_to_jalali_month_label(d):
    if not d:
        return ''
    if isinstance(d, str):
        try:
            d = date.fromisoformat(d)
        except:
            return d
    try:
        jd = jdatetime.date.fromgregorian(date=d)
        months = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
        return f'{months[jd.month]} {jd.year}'
    except Exception:
        return str(d)
