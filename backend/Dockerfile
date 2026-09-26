FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# paths.py/logger.py resolve DATA_DIR/logs two directories above this file's
# own location - since this image copies backend/'s contents straight into
# /app, that lands on /data and /logs. Mount a persistent volume at /data.
RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /data /logs \
    && chown -R appuser:appuser /app /data /logs
USER appuser

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
