# Active backend port is defined in /etc/nginx/dragncards-upstream.conf
# On blue-green deploy, that file is rewritten with the new port and nginx is reloaded.
# Existing websocket connections stay on the old backend until they close naturally.
include /etc/nginx/dragncards-upstream.conf;

server {
  root /var/www/dragncards.com/html;
  index index.html index.htm;

  server_name beta.dragncards.com www.beta.dragncards.com;
  client_max_body_size 16M;

  # Handle the API endpoint directly
  location /api/plugin-repo-update {
    proxy_pass http://phoenix;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  # Handle other requests
  location /be {
    rewrite ^/be/(.*)$ /$1 break;
    try_files $uri @proxy;
  }

  location / {
    try_files $uri @proxy $uri/ /index.html =404;
  }

  location @proxy {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://phoenix;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_http_version 1.1;
  }

  listen 443 ssl; # managed by Certbot
  ssl_certificate /etc/letsencrypt/live/beta.dragncards.com/fullchain.pem; # managed by Certbot
  ssl_certificate_key /etc/letsencrypt/live/beta.dragncards.com/privkey.pem; # managed by Certbot
  include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
  if ($host = www.beta.dragncards.com) {
      return 301 https://$host$request_uri;
  } # managed by Certbot

  if ($host = beta.dragncards.com) {
      return 301 https://$host$request_uri;
  } # managed by Certbot

  listen 80;
  listen [::]:80;
  server_name beta.dragncards.com www.beta.dragncards.com;
  return 404; # managed by Certbot
}
