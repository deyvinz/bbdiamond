#!/bin/bash

#===============================================================================
# VPS Setup Script for bbdiamond - Multi-Tenant Wedding Platform
# 
# This script sets up a fresh Ubuntu/Debian VPS with:
# - Latest Node.js LTS (via NodeSource)
# - Latest Docker CE and Docker Compose
# - Nginx for reverse proxy
# - Certbot for SSL certificates
# - Git for version control
# - Required system utilities
#
# Usage: 
#   chmod +x vps-setup.sh
#   sudo ./vps-setup.sh
#
# Tested on: Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Debian 11/12
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="22"  # LTS version (change to "23" for latest current)
APP_USER="deploy"
APP_DIR="/var/www/bbdiamond"
SWAP_SIZE="4G"

#===============================================================================
# Helper Functions
#===============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}=================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=================================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run as root (use sudo)"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
        echo "Detected OS: $OS $VERSION"
    else
        print_error "Cannot detect OS. This script requires Ubuntu or Debian."
        exit 1
    fi
    
    if [[ "$OS" != "ubuntu" && "$OS" != "debian" ]]; then
        print_warning "This script is optimized for Ubuntu/Debian. Proceeding anyway..."
    fi
}

#===============================================================================
# System Setup
#===============================================================================

setup_swap() {
    print_header "Setting up Swap Space"
    
    if swapon --show | grep -q '/swapfile'; then
        print_info "Swap file already exists"
        swapon --show
        return 0
    fi
    
    # Create swap file
    fallocate -l $SWAP_SIZE /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make permanent
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    
    # Optimize swappiness for production
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    
    print_success "Swap space configured: $SWAP_SIZE"
    swapon --show
}

update_system() {
    print_header "Updating System Packages"
    
    apt-get update
    apt-get upgrade -y
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
        wget \
        git \
        unzip \
        htop \
        nano \
        vim \
        ufw \
        fail2ban
    
    print_success "System packages updated"
}

#===============================================================================
# Node.js Installation (Latest LTS via NodeSource)
#===============================================================================

install_nodejs() {
    print_header "Installing Node.js v${NODE_VERSION} (Latest LTS)"
    
    # Remove old NodeSource list if exists
    rm -f /etc/apt/sources.list.d/nodesource.list
    rm -f /etc/apt/keyrings/nodesource.gpg
    
    # Create keyrings directory
    mkdir -p /etc/apt/keyrings
    
    # Download and import NodeSource GPG key
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    
    # Add NodeSource repository
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    
    # Install Node.js
    apt-get update
    apt-get install -y nodejs
    
    # Verify installation
    NODE_INSTALLED=$(node --version)
    NPM_INSTALLED=$(npm --version)
    
    print_success "Node.js installed: $NODE_INSTALLED"
    print_success "npm installed: v$NPM_INSTALLED"
    
    # Update npm to latest
    npm install -g npm@latest
    NPM_LATEST=$(npm --version)
    print_success "npm updated to latest: v$NPM_LATEST"
    
    # Install useful global packages
    npm install -g pm2
    print_success "PM2 installed globally (optional process manager)"
}

#===============================================================================
# Docker Installation (Latest CE)
#===============================================================================

install_docker() {
    print_header "Installing Docker CE (Latest)"
    
    # Remove old Docker packages if any
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/$OS/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$OS \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Verify installation
    DOCKER_VERSION=$(docker --version)
    COMPOSE_VERSION=$(docker compose version)
    
    print_success "Docker installed: $DOCKER_VERSION"
    print_success "Docker Compose installed: $COMPOSE_VERSION"
    
    # Add current user to docker group (if not root)
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
        print_info "Added $SUDO_USER to docker group. Log out and back in to apply."
    fi
}

#===============================================================================
# Nginx Installation
#===============================================================================

install_nginx() {
    print_header "Installing Nginx"
    
    apt-get install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Create sites directories if they don't exist
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    
    # Verify installation
    NGINX_VERSION=$(nginx -v 2>&1)
    print_success "Nginx installed: $NGINX_VERSION"
}

#===============================================================================
# Certbot Installation (SSL)
#===============================================================================

install_certbot() {
    print_header "Installing Certbot for SSL Certificates"
    
    apt-get install -y certbot python3-certbot-nginx
    
    # Verify installation
    CERTBOT_VERSION=$(certbot --version)
    print_success "Certbot installed: $CERTBOT_VERSION"
    
    # Enable certbot timer for auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    print_success "Certbot auto-renewal timer enabled"
}

#===============================================================================
# Firewall Configuration
#===============================================================================

configure_firewall() {
    print_header "Configuring Firewall (UFW)"
    
    # Reset UFW to default
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (important!)
    ufw allow ssh
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow http
    ufw allow https
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall
    ufw --force enable
    
    print_success "Firewall configured and enabled"
    ufw status verbose
}

#===============================================================================
# Fail2Ban Configuration
#===============================================================================

configure_fail2ban() {
    print_header "Configuring Fail2Ban"
    
    # Create local jail configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true

[nginx-bad-request]
enabled = true
EOF
    
    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    print_success "Fail2Ban configured and enabled"
}

#===============================================================================
# Create Deploy User
#===============================================================================

create_deploy_user() {
    print_header "Creating Deploy User"
    
    if id "$APP_USER" &>/dev/null; then
        print_info "User $APP_USER already exists"
    else
        adduser --disabled-password --gecos "" $APP_USER
        usermod -aG docker $APP_USER
        usermod -aG www-data $APP_USER
        print_success "Created user: $APP_USER"
    fi
    
    # Create app directory
    mkdir -p $APP_DIR
    chown -R $APP_USER:$APP_USER $APP_DIR
    
    print_success "App directory created: $APP_DIR"
}

#===============================================================================
# Setup Nginx Configuration for bbdiamond
#===============================================================================

setup_nginx_config() {
    print_header "Setting up Nginx Configuration"
    
    # Create nginx config for bbdiamond
    cat > /etc/nginx/sites-available/bbdiamond << 'EOF'
# Upstream to Docker containers
upstream luwani-weddings_backend {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# HTTP server (will be updated after SSL setup)
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    # For Certbot SSL verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Proxy to application
    location / {
        proxy_pass http://luwani-weddings_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://luwani-weddings_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    # Create Certbot webroot directory
    mkdir -p /var/www/certbot
    chown -R www-data:www-data /var/www/certbot
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Enable bbdiamond site
    ln -sf /etc/nginx/sites-available/bbdiamond /etc/nginx/sites-enabled/bbdiamond
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx configuration created"
}

#===============================================================================
# System Limits for Production
#===============================================================================

configure_system_limits() {
    print_header "Configuring System Limits"
    
    # Increase file descriptors limit
    cat >> /etc/security/limits.conf << 'EOF'

# Limits for bbdiamond application
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF
    
    # Kernel parameters for production
    cat >> /etc/sysctl.conf << 'EOF'

# Network performance tuning
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_max_syn_backlog = 4096
net.core.netdev_max_backlog = 5000
net.core.somaxconn = 4096

# File system performance
fs.file-max = 65535

# Disable IPv6 if not needed (optional)
# net.ipv6.conf.all.disable_ipv6 = 1
EOF
    
    # Apply sysctl changes
    sysctl -p
    
    print_success "System limits configured"
}

#===============================================================================
# Print Summary and Next Steps
#===============================================================================

print_summary() {
    print_header "Setup Complete! 🎉"
    
    echo ""
    echo -e "${GREEN}Installed Components:${NC}"
    echo "  • Node.js: $(node --version)"
    echo "  • npm: v$(npm --version)"
    echo "  • Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    echo "  • Docker Compose: $(docker compose version | cut -d' ' -f4)"
    echo "  • Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
    echo "  • Certbot: $(certbot --version | cut -d' ' -f2)"
    echo ""
    
    print_header "Next Steps"
    
    cat << 'EOF'
1. Upload your application to the VPS:
   -----------------------------------------
   # From your local machine:
   scp -r ./bbdiamond root@YOUR_VPS_IP:/var/www/
   
   # Or use git:
   cd /var/www/bbdiamond
   git clone YOUR_REPO_URL .

2. Create environment file:
   -----------------------------------------
   cd /var/www/bbdiamond
   cp env.production.example .env
   nano .env
   # Fill in all required values (Supabase, Redis, etc.)

3. Deploy the application:
   -----------------------------------------
   cd /var/www/bbdiamond
   chmod +x scripts/*.sh
   ./scripts/deploy.sh

4. Set up SSL certificate:
   -----------------------------------------
   # Replace yourdomain.com with your actual domain
   sudo ./scripts/setup-ssl.sh yourdomain.com your@email.com

5. Verify deployment:
   -----------------------------------------
   docker compose ps
   curl http://localhost:8080/api/health
   curl https://yourdomain.com

6. Monitor logs:
   -----------------------------------------
   docker compose logs -f
   tail -f /var/log/nginx/error.log

EOF
    
    print_header "Important Notes"
    
    cat << 'EOF'
• Log out and back in for docker group permissions to take effect
• Update your DNS A record to point to this server's IP
• For wildcard SSL (*.yourdomain.com), you'll need DNS validation
• Default app user: deploy (use 'su - deploy' to switch)
• App directory: /var/www/bbdiamond
• Firewall allows: SSH (22), HTTP (80), HTTPS (443)
• Fail2Ban is active - check /var/log/fail2ban.log
EOF
    
    echo ""
    print_success "VPS setup complete! Ready for deployment."
    echo ""
}

#===============================================================================
# Main Execution
#===============================================================================

main() {
    print_header "bbdiamond VPS Setup Script"
    
    echo "This script will install:"
    echo "  • Node.js v${NODE_VERSION} (Latest LTS)"
    echo "  • Docker CE (Latest)"
    echo "  • Docker Compose (Latest)"
    echo "  • Nginx"
    echo "  • Certbot"
    echo "  • Security tools (UFW, Fail2Ban)"
    echo ""
    
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    # Check prerequisites
    check_root
    detect_os
    
    # Run setup steps
    update_system
    setup_swap
    install_nodejs
    install_docker
    install_nginx
    install_certbot
    configure_firewall
    configure_fail2ban
    create_deploy_user
    setup_nginx_config
    configure_system_limits
    
    # Print summary
    print_summary
}

# Run main function
main "$@"

