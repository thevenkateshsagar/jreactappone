# React Vite App - Jenkins CI/CD Deployment to AWS EC2

## Complete Guide: From Setup to Production Deployment

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Local Development Setup](#phase-1-local-development-setup)
4. [Phase 2: AWS EC2 Setup](#phase-2-aws-ec2-setup)
5. [Phase 3: Jenkins Configuration](#phase-3-jenkins-configuration)
6. [Phase 4: Jenkins Pipeline Setup](#phase-4-jenkins-pipeline-setup)
7. [Phase 5: Deployment & Verification](#phase-5-deployment--verification)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## Overview

This guide walks through setting up a complete CI/CD pipeline for a React Vite application using:
- **Frontend**: React with Vite
- **CI/CD**: Jenkins
- **Hosting**: AWS EC2 with Nginx
- **Version Control**: GitHub

### Architecture Flow
```
Developer → GitHub → Jenkins (Build & Test) → AWS EC2 (Nginx) → Production
```

---

## Prerequisites

### Required Tools
- AWS Account with EC2 access
- GitHub account and repository
- Jenkins server (installed and running)
- Basic knowledge of:
  - Linux commands
  - Git
  - Node.js/npm
  - SSH

### Required Access
- AWS EC2 keypair (.pem file)
- GitHub repository access
- Jenkins admin access

---

## Phase 1: Local Development Setup

### 1.1 VS Code Extensions

Install the following VS Code extension for Jenkins pipeline development:

**Jenkins Pipeline Linter Connector**
- Extension ID: `janjoerke.jenkins-pipeline-linter-connector`
- Features: Real-time syntax validation, error detection

#### Installation
```bash
# In VS Code
Ctrl + Shift + X (Open Extensions)
Search: "Jenkins Pipeline Linter Connector"
Click Install
```

#### Configuration
Open VS Code settings (Ctrl + Shift + P → "Preferences: Open User Settings (JSON)")

Add the following configuration:
```json
{
  "jenkins.pipeline.linter.connector.url": "http://your-jenkins-url:8080/pipeline-model-converter/validate",
  "jenkins.pipeline.linter.connector.user": "your-jenkins-username",
  "jenkins.pipeline.linter.connector.token": "your-jenkins-api-token",
  "jenkins.pipeline.linter.connector.crumbUrl": "http://your-jenkins-url:8080/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,%22:%22,//crumb)"
}
```

### 1.2 Node.js Version Selection

For Jenkins CI/CD pipeline, we selected **Node.js 22.x LTS** because:
- ✅ Active LTS (Long Term Support)
- ✅ Long support window
- ✅ Modern features and best performance
- ✅ Wide package compatibility
- ✅ Production-ready stability

**Alternative Options:**
- Node.js 20.x LTS (if you need broader compatibility)
- Node.js 18.x (maintenance mode, supported until April 2025)

**Decision Criteria:**
1. Check your `package.json` for `engines` field
2. Match your development environment
3. Choose LTS for production deployments
4. Ensure compatibility with your dependencies

---

## Phase 2: AWS EC2 Setup

### 2.1 Launch EC2 Instance

1. **Log into AWS Console**
2. **Navigate to EC2** → Launch Instance
3. **Configure Instance:**
   - **Name**: `react-app-server` (or your preferred name)
   - **AMI**: Ubuntu Server 24.04 LTS
   - **Instance Type**: t2.micro (Free tier eligible)
   - **Key Pair**: Select existing or create new (.pem file)
   - **Network Settings**:
     - Create security group with:
       - SSH (Port 22) - Your IP only
       - HTTP (Port 80) - Anywhere (0.0.0.0/0)
   - **Storage**: 8 GB (default)
4. **Launch Instance**

### 2.2 Connect to EC2

```bash
# Change permissions on your .pem file
chmod 400 your-key.pem

# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 2.3 Install Nginx

```bash
# Update package manager
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx

# Test installation
curl localhost
# Should see "Welcome to nginx!" page
```

### 2.4 Configure Nginx for React Vite App

#### Create Application Directory
```bash
# Create directory for React app
sudo mkdir -p /var/www/react-app

# Set ownership to ubuntu user
sudo chown -R ubuntu:ubuntu /var/www/react-app

# Set proper permissions
sudo chmod -R 755 /var/www/react-app
```

#### Configure Nginx Server Block

```bash
# Backup original config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/default
```

**Replace entire content with:**
```nginx
server {
	listen 80 default_server;
	listen [::]:80 default_server;

	root /var/www/react-app;
	
	index index.html;

	server_name _;

	# SPA routing - redirect all routes to index.html
	location / {
		try_files $uri $uri/ /index.html;
	}

	# Cache static assets (JS, CSS, images, fonts)
	location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
		expires 1y;
		add_header Cache-Control "public, immutable";
	}

	# Don't cache index.html
	location = /index.html {
		add_header Cache-Control "no-cache, no-store, must-revalidate";
	}

	# Gzip compression for better performance
	gzip on;
	gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

#### Test and Apply Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# If successful, restart Nginx
sudo systemctl restart nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 2.5 Configure Firewall (Optional but Recommended)

```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status
```

---

## Phase 3: Jenkins Configuration

### 3.1 Install Node.js Plugin in Jenkins

1. **Navigate to Jenkins Dashboard**
2. **Manage Jenkins** → **Plugins** → **Available plugins**
3. **Search**: "NodeJS"
4. **Select**: NodeJS Plugin
5. **Install** and restart Jenkins if required

### 3.2 Configure Node.js Tool

1. **Manage Jenkins** → **Tools**
2. **Scroll to NodeJS installations**
3. **Click "Add NodeJS"**
4. **Configure:**
   - **Name**: `node22` (this name will be used in pipeline)
   - **Version**: Select NodeJS 22.x.x
   - **Install automatically**: ✅ Checked
5. **Save**

### 3.3 Create SSH Credentials for EC2

1. **Jenkins Dashboard** → **Manage Jenkins** → **Credentials**
2. **Click "System"** → **Global credentials (unrestricted)**
3. **Click "Add Credentials"**

**Fill in the form:**
- **Kind**: `SSH Username with private key`
- **Scope**: `Global (Jenkins, nodes, items, all child items, etc)`
- **ID**: `ec2-ssh-credentials` ← **Important: This ID is used in pipeline**
- **Description**: `EC2 SSH Key for deployment`
- **Username**: `ubuntu`
- **Private Key**: 
  - Select **"Enter directly"**
  - Click **"Add"**
  - Paste your entire `.pem` file content including:
    ```
    -----BEGIN RSA PRIVATE KEY-----
    ... your key content ...
    -----END RSA PRIVATE KEY-----
    ```
- **Passphrase**: Leave empty (unless your key has one)

4. **Click "Create"**

### 3.4 Verify Credentials

- Go back to **Credentials** → **System** → **Global credentials**
- You should see `ec2-ssh-credentials` listed
- **ID** must match exactly what's used in the pipeline

---

## Phase 4: Jenkins Pipeline Setup

### 4.1 Create Jenkins Pipeline Job

1. **Jenkins Dashboard** → **New Item**
2. **Enter name**: `vite-react-pipeline` (or your preferred name)
3. **Select**: Pipeline
4. **Click OK**

### 4.2 Configure Pipeline

#### General Settings
- **Description**: `CI/CD pipeline for React Vite app deployment to EC2`
- **GitHub project**: ✅ Check this
  - **Project url**: `https://github.com/YOUR_USERNAME/YOUR_REPO`

#### Build Triggers (Optional)
- **GitHub hook trigger for GITScm polling**: ✅ Check for automatic builds on push

#### Pipeline Configuration
- **Definition**: Pipeline script from SCM
- **SCM**: Git
- **Repository URL**: `https://github.com/YOUR_USERNAME/YOUR_REPO`
- **Credentials**: None (if public repo)
- **Branch Specifier**: `*/main` (or your branch name)
- **Script Path**: `Jenkinsfile`

### 4.3 Create Jenkinsfile

Create a file named `Jenkinsfile` in your repository root:

```groovy
pipeline {
    agent any

    tools {
        nodejs 'node22'
    }

    stages {
        stage('Verify Node') {
            steps {
                sh 'node -v'
                sh 'npm -v'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Archive Build') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Deploy to EC2') {
            steps {
                script {
                    withCredentials([sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-credentials',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )]) {
                        sh '''
                            # Set proper permissions for SSH key
                            chmod 600 $SSH_KEY
                            
                            # Define EC2 details
                            EC2_HOST="YOUR_EC2_PUBLIC_IP"
                            
                            # Remove old files from EC2
                            ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@$EC2_HOST "sudo rm -rf /var/www/react-app/*"
                            
                            # Copy new build files to EC2
                            scp -i $SSH_KEY -o StrictHostKeyChecking=no -r dist/* $SSH_USER@$EC2_HOST:/tmp/
                            
                            # Move files to nginx directory with proper permissions
                            ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@$EC2_HOST "sudo mv /tmp/* /var/www/react-app/ && sudo chown -R www-data:www-data /var/www/react-app && sudo systemctl restart nginx"
                        '''
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'curl -f http://YOUR_EC2_PUBLIC_IP || exit 1'
            }
        }
    }

    post {
        success {
            echo 'React Vite build and deployment successful!'
        }
        failure {
            echo 'Build or deployment failed!'
        }
    }
}
```

**Important:** Replace `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IP address in:
- Line 39: `EC2_HOST="YOUR_EC2_PUBLIC_IP"`
- Line 55: `sh 'curl -f http://YOUR_EC2_PUBLIC_IP || exit 1'`

### 4.4 Commit and Push

```bash
# Add Jenkinsfile to your repository
git add Jenkinsfile
git commit -m "Add Jenkins CI/CD pipeline"
git push origin main
```

---

## Phase 5: Deployment & Verification

### 5.1 Run the Pipeline

1. **Go to Jenkins Dashboard**
2. **Click on your pipeline**: `vite-react-pipeline`
3. **Click "Build Now"**
4. **Monitor the build**:
   - Click on the build number (e.g., #1)
   - Click "Console Output" to see logs

### 5.2 Pipeline Stages

The pipeline will execute these stages:
1. ✅ **Verify Node** - Check Node.js and npm versions
2. ✅ **Install Dependencies** - Run `npm ci`
3. ✅ **Build** - Run `npm run build` (creates dist/ folder)
4. ✅ **Archive Build** - Save build artifacts in Jenkins
5. ✅ **Deploy to EC2** - Copy files to EC2 and restart Nginx
6. ✅ **Verify Deployment** - Test if site is accessible

### 5.3 Verify Deployment on EC2

#### Method 1: Browser Verification
```
Open browser: http://YOUR_EC2_PUBLIC_IP
```
✅ You should see your React Vite application running

#### Method 2: SSH Verification
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Check deployed files
ls -la /var/www/react-app/

# Expected output:
# index.html
# assets/
#   - index-[hash].js
#   - index-[hash].css
#   - react-[hash].svg

# Check file permissions
ls -lh /var/www/react-app/

# Check Nginx status
sudo systemctl status nginx

# View recent access logs
sudo tail -20 /var/log/nginx/access.log

# View error logs (should be empty if working)
sudo tail -20 /var/log/nginx/error.log
```

#### Method 3: Command Line Test
```bash
# Test from your local machine
curl http://YOUR_EC2_PUBLIC_IP

# Check HTTP headers
curl -I http://YOUR_EC2_PUBLIC_IP
# Should return: HTTP/1.1 200 OK

# Test specific routes (SPA routing)
curl http://YOUR_EC2_PUBLIC_IP/about
# Should return index.html (not 404)
```

### 5.4 Expected Results

**✅ Successful Deployment Indicators:**
- Jenkins build status: SUCCESS (green)
- All pipeline stages passed
- Browser shows your React app with styling
- No errors in Nginx logs
- HTTP status code: 200 OK
- SPA routing works (page refresh doesn't give 404)

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Jenkins Can't Find Credentials
**Error**: `Could not find credentials entry with ID 'ec2-ssh-credentials'`

**Solution:**
1. Verify credential ID matches in both Jenkins and Jenkinsfile
2. Check credential is in "Global" scope
3. Re-create the credential if needed

#### Issue 2: SSH Connection Failed
**Error**: `Permission denied (publickey)`

**Solution:**
```bash
# Check security group allows SSH from Jenkins
# Verify .pem file is correct
# Ensure username is 'ubuntu' for Ubuntu AMI
```

#### Issue 3: Nginx Shows Default Page
**Error**: Browser shows "Welcome to nginx!" instead of React app

**Solution:**
```bash
# Check if files are deployed
ls -la /var/www/react-app/

# Verify Nginx config points to correct directory
sudo nano /etc/nginx/sites-available/default
# root should be: /var/www/react-app

# Restart Nginx
sudo systemctl restart nginx

# Clear browser cache or use incognito mode
```

#### Issue 4: 404 on Page Refresh
**Error**: Refreshing any route gives 404

**Solution:**
```bash
# Ensure Nginx config has SPA routing
sudo nano /etc/nginx/sites-available/default

# Must have this line:
try_files $uri $uri/ /index.html;

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

#### Issue 5: Build Fails - Dependencies Error
**Error**: `npm ci` fails with dependency errors

**Solution:**
```bash
# Locally clean install
rm -rf node_modules package-lock.json
npm install

# Commit updated package-lock.json
git add package-lock.json
git commit -m "Update dependencies"
git push
```

#### Issue 6: Permission Denied on EC2
**Error**: Can't write to `/var/www/react-app/`

**Solution:**
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Fix permissions
sudo chown -R ubuntu:ubuntu /var/www/react-app
sudo chmod -R 755 /var/www/react-app
```

#### Issue 7: Jenkins Plugin Not Found
**Error**: `No such DSL method 'sshagent' found`

**Solution:**
- We're using `withCredentials` instead, which is built-in
- No additional plugins needed
- Ensure Jenkinsfile uses the correct syntax from this guide

---

## Security Best Practices

### 1. EC2 Security Group Rules

**Restrict SSH Access:**
```
Type: SSH (22)
Source: Jenkins Server IP only (not 0.0.0.0/0)
```

**Allow HTTP Access:**
```
Type: HTTP (80)
Source: 0.0.0.0/0 (public access)
```

### 2. SSH Key Management

- ✅ Never commit .pem files to Git
- ✅ Use different keys for different environments
- ✅ Rotate keys periodically
- ✅ Store keys securely (use Jenkins credentials store)

### 3. Nginx Security Headers

Add to Nginx config:
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### 4. Environment Variables

**For sensitive data in React:**
```bash
# Create .env file (don't commit to Git)
VITE_API_URL=https://api.example.com
VITE_API_KEY=your-secret-key

# Add to .gitignore
echo ".env" >> .gitignore

# In Jenkins, use credentials plugin to inject secrets
```

### 5. HTTPS Setup (Recommended for Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl status certbot.timer
```

### 6. Jenkins Security

- ✅ Enable authentication
- ✅ Use role-based access control
- ✅ Keep Jenkins updated
- ✅ Use Jenkins credentials store for all secrets
- ✅ Enable audit logging

### 7. File Permissions

```bash
# Application files
sudo chown -R www-data:www-data /var/www/react-app
sudo chmod -R 755 /var/www/react-app

# Nginx config
sudo chown root:root /etc/nginx/sites-available/default
sudo chmod 644 /etc/nginx/sites-available/default
```

---

## Maintenance Tasks

### Regular Updates

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Update system packages
sudo apt update
sudo apt upgrade -y

# Update Nginx
sudo apt install --only-upgrade nginx

# Restart Nginx
sudo systemctl restart nginx
```

### Monitoring Logs

```bash
# Watch Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Watch Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check disk usage
df -h

# Check system resources
htop
```

### Backup Strategy

```bash
# Backup Nginx config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d)

# Backup application files
sudo tar -czf /home/ubuntu/react-app-backup-$(date +%Y%m%d).tar.gz /var/www/react-app/
```

---

## Pipeline Enhancements

### 1. Add Testing Stage

```groovy
stage('Run Tests') {
    steps {
        sh 'npm test -- --run'
    }
}
```

### 2. Add Linting Stage

```groovy
stage('Lint Code') {
    steps {
        sh 'npm run lint'
    }
}
```

### 3. Add Build Notifications

```groovy
post {
    success {
        mail to: 'team@example.com',
             subject: "Build Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
             body: "Deployment successful! Visit http://YOUR_EC2_PUBLIC_IP"
    }
    failure {
        mail to: 'team@example.com',
             subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
             body: "Build failed. Check console output: ${env.BUILD_URL}"
    }
}
```

### 4. Multi-Environment Deployment

```groovy
parameters {
    choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'production'], description: 'Select environment')
}

stage('Deploy') {
    steps {
        script {
            def ec2Host = params.ENVIRONMENT == 'production' ? '54.1.2.3' : '54.1.2.4'
            // ... deployment logic
        }
    }
}
```

---

## Conclusion

You now have a fully functional CI/CD pipeline that:
- ✅ Automatically builds your React Vite app
- ✅ Runs tests and validations
- ✅ Deploys to AWS EC2
- ✅ Serves your app with Nginx
- ✅ Handles SPA routing correctly
- ✅ Optimizes static assets with caching

### Next Steps

1. **Add HTTPS** with Let's Encrypt
2. **Configure Custom Domain** 
3. **Set up Monitoring** (CloudWatch, Datadog, etc.)
4. **Implement Blue-Green Deployment**
5. **Add Automated Testing**
6. **Configure CDN** (CloudFront)

---

## Quick Reference Commands

### Jenkins
```bash
# Restart Jenkins
sudo systemctl restart jenkins

# Check Jenkins status
sudo systemctl status jenkins

# View Jenkins logs
sudo journalctl -u jenkins -f
```

### EC2 + Nginx
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Restart Nginx
sudo systemctl restart nginx

# Test Nginx config
sudo nginx -t

# View deployed files
ls -la /var/www/react-app/

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Git
```bash
# Push changes
git add .
git commit -m "Your message"
git push origin main

# Trigger Jenkins build (if webhook configured)
# Push will automatically trigger build
```

---

## Resources

- **Nginx Documentation**: https://nginx.org/en/docs/
- **Jenkins Documentation**: https://www.jenkins.io/doc/
- **Vite Documentation**: https://vitejs.dev/
- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **Node.js Releases**: https://nodejs.org/en/about/releases/

---

## Support

If you encounter issues:
1. Check the Troubleshooting section
2. Review Jenkins console output
3. Check Nginx error logs on EC2
4. Verify security group settings
5. Test SSH connectivity manually

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Production Ready ✅
