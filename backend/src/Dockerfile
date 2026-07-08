FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt


FROM base AS development

COPY src/ /app/

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]


FROM base AS production

COPY src/ /app/

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]