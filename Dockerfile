# Usa a imagem do Node.js
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos do projeto para o container
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# Instala as dependências do Puppeteer
RUN apt-get update && apt-get install -y \
    libatk1.0-0 \
    libnss3 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libgbm-dev \
    && rm -rf /var/lib/apt/lists/*

# Define a variável de ambiente para desativar o sandbox do Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Comando para rodar o serviço
CMD ["node", "main.js"]
