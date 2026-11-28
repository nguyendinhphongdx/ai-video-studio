# One image for both processes (web and worker); docker-compose.yml runs them as two services.
FROM node:22-bookworm-slim

# ffmpeg for assembly, Chrome's shared libraries for Remotion's headless shell, python for edge-tts.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-venv ca-certificates fonts-noto-core \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 libxkbcommon0 \
    libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/edge && /opt/edge/bin/pip install --no-cache-dir edge-tts

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  # Download Remotion's Chrome Headless Shell into the image so the first render does not need the network.
  && npx remotion browser ensure

ENV NODE_ENV=production \
    AVS_DATA_DIR=/data \
    AVS_EDGE_TTS=/opt/edge/bin/edge-tts
VOLUME /data
EXPOSE 3300
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3300"]
