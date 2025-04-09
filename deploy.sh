#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx if not already installed
sudo apt-get install -y nginx

# Create application directory
sudo mkdir -p /var/www/schulferien-api
sudo chown -R $USER:$USER /var/www/schulferien-api

# Copy application files (assuming you're running this from the project directory)
cp -r . /var/www/schulferien-api/

# Install dependencies
echo "Installing dependencies..."
cd /var/www/schulferien-api
npm install --production

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/schulferien-api << EOF
server {
    listen 80;
    server_name fibosaur.com www.fibosaur.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/schulferien-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d fibosaur.com -d www.fibosaur.com --non-interactive --agree-tos --email your-email@example.com

# Restart the application
echo "Restarting application..."
pm2 restart schulferien-api || pm2 start index.js --name schulferien-api

# Save PM2 process list
pm2 save

# Configure PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Set up firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh
sudo ufw enable

echo "Deployment completed successfully!" 