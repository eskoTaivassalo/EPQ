FROM ubuntu:22.04

# Perusriippuvuudet + Java 17
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    ca-certificates \
    openssh-client \
    build-essential \
    python3 \
    wget \
    xz-utils \
    openjdk-17-jdk && \
    rm -rf /var/lib/apt/lists/*

# Node.js 20 (NodeSource)
RUN bash -lc 'set -euo pipefail; \
    apt-get update && apt-get install -y ca-certificates gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs && \
    npm -v && node -v && \
    npm install -g eas-cli'

# Android SDK polut
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

# Asenna Android SDK Command-line tools (oikea kansiorakenne: cmdline-tools/latest)
WORKDIR /opt/android-sdk
RUN bash -lc 'set -euo pipefail; \
    mkdir -p $ANDROID_HOME/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools && \
    mkdir -p $ANDROID_HOME/cmdline-tools/latest && \
    mv /tmp/cmdline-tools/cmdline-tools/* $ANDROID_HOME/cmdline-tools/latest/ && \
    rm -rf /tmp/cmdline-tools /tmp/cmdline-tools.zip'

# Hyväksy lisenssit ja asenna tarvittavat paketit
RUN bash -lc 'yes | sdkmanager --sdk_root=$ANDROID_HOME --licenses'
RUN bash -lc 'sdkmanager --sdk_root=$ANDROID_HOME \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0"'

# Sovellus
WORKDIR /app
COPY package*.json ./
RUN bash -lc '[ -f package-lock.json ] && npm ci || npm install'
COPY . .

# Oletuskomento: kopioi .env.preview -> .env jos puuttuu, sitten aja build
SHELL ["/bin/bash", "-lc"]
CMD 'if [[ -f .env.preview && ! -f .env ]]; then cp .env.preview .env; fi; eas build --local --platform android --profile preview'