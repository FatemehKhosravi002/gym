import re


def normalize_persian(s):
    if not s:
        return ''
    s = s.strip()
    s = s.replace('ي', 'ی').replace('ك', 'ک')
    s = re.sub(r'[\u200c\s]+', '', s)
    return s.lower()
