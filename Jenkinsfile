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
                    // Using SSH credentials configured in Jenkins
                    sshagent(credentials: ['ec2-ssh-credentials']) {
                        sh '''
                            # Remove old files from EC2
                            ssh -o StrictHostKeyChecking=no ubuntu@54.87.89.63 "sudo rm -rf /var/www/react-app/*"
                            
                            # Copy new build files to EC2
                            scp -o StrictHostKeyChecking=no -r dist/* ubuntu@54.87.89.63:/tmp/
                            
                            # Move files to nginx directory with proper permissions
                            ssh -o StrictHostKeyChecking=no ubuntu@54.87.89.63 "sudo mv /tmp/* /var/www/react-app/ && sudo chown -R www-data:www-data /var/www/react-app && sudo systemctl restart nginx"
                        '''
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    sh 'curl -f http://54.87.89.63 || exit 1'
                }
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