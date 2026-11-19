FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    fontconfig \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

# Sahel FD must be visible to fontconfig as well as to the @font-face rule in
# apps/programs/pdf.py, otherwise WeasyPrint falls back to a font without the
# Persian glyphs (broken shaping / tofu boxes).
COPY fonts/ /usr/local/share/fonts/physique/
RUN fc-cache -f

RUN mkdir -p /app/media /app/staticfiles

EXPOSE 8000

CMD ["gunicorn", "gym_backend.wsgi:application", "--bind", "0.0.0.0:8000"]
