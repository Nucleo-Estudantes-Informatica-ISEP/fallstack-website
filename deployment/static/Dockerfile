FROM node:26.13.1-alpine3.24 AS build
WORKDIR /app
RUN npm install --global corepack@0.35.0 && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY scripts/build-deployment.tsx scripts/build-deployment.tsx
COPY src/config/deploymentMode.ts src/config/deploymentMode.ts
COPY src/edition src/edition
COPY tsconfig.json tsconfig.json
COPY src/components/EditionIntroduction src/components/EditionIntroduction
COPY deployment/static deployment/static
COPY public/assets/images/logo-white.png public/assets/images/logo-white.png
COPY public/assets/images/logo-simplified-white.png public/assets/images/logo-simplified-white.png
ARG DEPLOYMENT_MODE
ARG EDITION_STARTS_AT=
RUN test "$DEPLOYMENT_MODE" = "OFF-SEASON" || test "$DEPLOYMENT_MODE" = "PREPARATION"
RUN DEPLOYMENT_MODE=$DEPLOYMENT_MODE EDITION_STARTS_AT=$EDITION_STARTS_AT pnpm build:deployment
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY deployment/static/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/static-output /usr/share/nginx/html
