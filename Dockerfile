FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy only the discord bot package
COPY artifacts/discord-bot ./artifacts/discord-bot

# Install dependencies (only for the discord bot)
RUN pnpm install --filter @workspace/discord-bot --no-frozen-lockfile

WORKDIR /app/artifacts/discord-bot

CMD ["npx", "tsx", "src/index.ts"]
