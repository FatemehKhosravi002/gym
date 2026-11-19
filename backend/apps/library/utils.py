import difflib
import re


SIMILAR_NAME_CUTOFF = 0.72


def normalize_persian(s):
    if not s:
        return ''
    s = s.strip()
    s = s.replace('ي', 'ی').replace('ك', 'ک')
    s = re.sub(r'[\u200c\s]+', '', s)
    return s.lower()


def similar_names(name, candidates, cutoff=SIMILAR_NAME_CUTOFF, limit=3):
    """Names that look like `name` but are not exact (for the «شبیه این» warning)."""
    normalized = normalize_persian(name)
    if not normalized:
        return []
    matches = []
    for candidate in candidates:
        candidate_norm = normalize_persian(candidate)
        if not candidate_norm or candidate_norm == normalized:
            continue
        ratio = difflib.SequenceMatcher(None, normalized, candidate_norm).ratio()
        if ratio >= cutoff:
            matches.append((ratio, candidate))
    matches.sort(key=lambda pair: pair[0], reverse=True)
    return [candidate for _, candidate in matches[:limit]]

