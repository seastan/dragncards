# Active backend port is defined in /etc/nginx/dragncards-upstream.conf
# On blue-green deploy, that file is rewritten with the new port and nginx is reloaded.
# Existing websocket connections stay on the old backend until they close naturally.
include /etc/nginx/dragncards-upstream.conf;

server {
  root /var/www/dragncards.com/html;
  index index.html index.htm;

  server_name dragncards.com www.dragncards.com;
  client_max_body_size 16M;


  # ---- User-uploaded plugin images --------------------------------------
  # Served straight off the upload volume (/mnt/uploads).
  # Everything under it is a backend-written .webp; anything else 404s, so a
  # stray file can never become same-origin active content (an .svg or .html
  # here would be stored XSS against this domain).
  #
  # The regex uses a named capture + alias because the on-disk directory name
  # does not always match the URL segment (beta uses /mnt/beta_uploads).
  # The (?!.*\.\.) lookahead blocks traversal; nginx also normalises the URI
  # before matching, so this is belt-and-braces.
  location ~* "^/uploads/(?<upload_path>(?!.*\.\.).+\.webp)$" {
      alias /mnt/uploads/$upload_path;
      autoindex off;
      disable_symlinks if_not_owner from=/mnt/uploads;
      access_log off;

      types { image/webp webp; }
      default_type image/webp;

      # NOT immutable: authors re-upload over the same path to fix an image.
      # One day plus ETag revalidation means a stale card face self-heals
      # within 24h while repeat loads stay cheap 304s.
      # Set via add_header rather than `expires 1d`, because using both emits
      # two Cache-Control headers. nginx still generates the ETag.
      add_header Cache-Control "public, max-age=86400" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header Access-Control-Allow-Origin "*" always;

      gzip off;                 # webp is already compressed
      sendfile on;
      tcp_nopush on;
      open_file_cache max=20000 inactive=120s;
      open_file_cache_valid 60s;
      open_file_cache_min_uses 2;
      open_file_cache_errors on;
  }

  # Anything under /uploads/ that is not a .webp. Deliberately NOT ^~, because
  # ^~ would stop nginx evaluating the regex location above and every image
  # would 404.
  location /uploads/ {
      return 404;
  }

  # Image uploads need a larger body than the 16M server default. Scoped to this
  # one endpoint rather than raising client_max_body_size site-wide.
  location ^~ /be/api/v1/images/ {
      client_max_body_size 64M;
      client_body_timeout  120s;
      proxy_read_timeout   120s;
      rewrite ^/be/(.*)$ /$1 break;
      try_files $uri @proxy;
  }

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
  ssl_certificate /etc/letsencrypt/live/dragncards.com/fullchain.pem; # managed by Certbot
  ssl_certificate_key /etc/letsencrypt/live/dragncards.com/privkey.pem; # managed by Certbot
  include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
  if ($host = www.dragncards.com) {
      return 301 https://$host$request_uri;
  } # managed by Certbot

  if ($host = dragncards.com) {
      return 301 https://$host$request_uri;
  } # managed by Certbot

  listen 80;
  listen [::]:80;
  server_name dragncards.com www.dragncards.com;
  return 404; # managed by Certbot
}
