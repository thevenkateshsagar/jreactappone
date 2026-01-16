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

        stage('Run Unit Tests') {
            steps {
                sh 'npm run test:run'
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
                    withCredentials([sshUserPrivateKey(credentialsId: 'ec2-ssh-credentials', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
                        sh '''
                            # Set proper permissions for SSH key
                            chmod 600 $SSH_KEY
                            
                            # Define EC2 details
                            EC2_HOST="54.87.89.63"
                            
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
                sh 'curl -f http://54.87.89.63 || exit 1'
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