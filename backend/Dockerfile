# ── Base image already ships GDAL 3.8 ────────────────────────────────────────
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.8.0

# Install Python toolchain + PostgreSQL client libs
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Point rasterio / pyproj at the system GDAL
ENV GDAL_CONFIG=/usr/bin/gdal-config

WORKDIR /app

RUN mkdir -p /app/uploads /tmp/tif_uploads

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
