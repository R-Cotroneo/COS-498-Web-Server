
FROM nginx:alpine

# Copy custom nginx configuration to the correct location
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy static files to nginx html directory
COPY public/ /usr/share/nginx/html/

EXPOSE 7979

CMD ["nginx", "-g", "daemon off;"]
