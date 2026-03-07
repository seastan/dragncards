# build environment
FROM node:20-alpine AS build
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
COPY package.json /app/package.json
RUN npm install --legacy-peer-deps --silent
COPY . /app
# compile tailwind CSS then build JS bundle
RUN npm run build:css && npm run build

# production environment
FROM nginx:1.25-alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
