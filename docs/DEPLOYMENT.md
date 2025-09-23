# Chatat Deployment Guide

## Prerequisites

### For APK Building
- GitHub repository connected
- Android development environment (for local testing)

### For Termux Deployment
- Android device with Termux installed
- SSH server setup in Termux
- Node.js and PM2 installed in Termux

## APK Building via GitHub Actions

### Setup Steps:
1. **Connect to GitHub**: Use Lovable's "Export to GitHub" feature
2. **Automatic Building**: Every push to main/master triggers APK build
3. **Download APK**: Check GitHub Actions > Artifacts section

### Manual APK Build:
```bash
# Clone your repo
git clone your-repo-url
cd chatat-app

# Install dependencies
npm install

# Add Android platform
npx cap add android

# Build and sync
npm run build
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
```

## Termux Deployment Setup

### 1. Install Termux Requirements:
```bash
# Update packages
pkg update && pkg upgrade

# Install Node.js and PM2
pkg install nodejs-lts
npm install -g pm2

# Install Git and OpenSSH
pkg install git openssh

# Setup SSH server
sshd
```

### 2. Setup SSH Keys:
```bash
# Generate SSH key in Termux
ssh-keygen -t rsa -b 4096

# Add public key to authorized_keys
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Configure GitHub Secrets:
Go to GitHub repository settings > Secrets and add:
- `TERMUX_HOST`: Your device IP address
- `TERMUX_USER`: Usually 'u0_a***' in Termux
- `TERMUX_SSH_KEY`: Content of ~/.ssh/id_rsa (private key)
- `TERMUX_PORT`: SSH port (default 8022)

### 4. Clone and Setup Project:
```bash
# Clone your repository
git clone your-repo-url ~/chatat-app
cd ~/chatat-app

# Install dependencies
npm install

# Build project
npm run build
```

## Real-time Chat Backend

For real-time chat functionality, you have two options:

### Option 1: Supabase (Recommended)
- Connect Supabase integration in Lovable
- Use Supabase Realtime for chat features
- Automatic scaling and management

### Option 2: Custom Backend in Termux
```bash
# Install additional packages for backend
pkg install redis postgresql

# Create backend server
mkdir server
cd server

# Setup Node.js backend with Socket.io
npm init -y
npm install express socket.io cors
```

## Running in Production

### Start Services:
```bash
# Start Redis (if using custom backend)
redis-server &

# Start your backend server
pm2 start server/index.js --name chatat-server

# Save PM2 configuration
pm2 save
pm2 startup
```

### Monitor Services:
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs chatat-server

# Restart service
pm2 restart chatat-server
```

## Updating the App

GitHub Actions automatically:
1. Pulls latest code to Termux
2. Installs new dependencies
3. Rebuilds the app
4. Restarts services with PM2

## Troubleshooting

### APK Build Issues:
- Check Java version (requires Java 17+)
- Verify Android SDK installation
- Check Capacitor configuration

### Termux Deployment Issues:
- Verify SSH connection: `ssh user@host -p port`
- Check PM2 processes: `pm2 status`
- Monitor logs: `pm2 logs`

### Network Issues:
- Ensure port forwarding for external access
- Check firewall settings
- Verify SSH server is running: `pgrep sshd`