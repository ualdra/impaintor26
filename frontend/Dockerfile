FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g @angular/cli@21
COPY package*.json ./
RUN NODE_ENV=development npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
