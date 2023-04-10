pipeline {
    agent any
    stages {
        stage('Checkout source code') {
            steps {
                git branch: 'nhnobnd1', url: 'https://github.com/oppabgnamdz/node-getmagnet'
                slackSend(color: '#36a64f', message: "Clone done. Start,   ${JOB_NAME}  #${BUILD_NUMBER} ")
                
            }
        }
        stage('Check and Stop Docker container') {
            steps {
                script {
                    def containerExists = sh(script: "docker ps -a --filter name=node-magnet2 --format '{{.Names}}'", returnStdout: true).trim()
                    if (containerExists) {
                        sh 'docker stop node-magnet2'
                        sh 'docker rm node-magnet2'
                    }
                }
            }
        }
        stage('Build and Run Docker container') {
            steps {
                sh 'docker build -t node-magnet2 .'
                sh 'docker run -d --name node-magnet2 -p 4000:4000 node-magnet2'
                slackSend(color: '#36a64f', message: "The build has completed successfully.${JOB_NAME}  #${BUILD_NUMBER}")

            }
        }
    }
    post {
    success {
      echo 'The pipeline has completed successfully.'
      slackSend(color: '#36a64f', message: "The pipeline has completed successfully ${JOB_NAME}  #${BUILD_NUMBER} <!channel>")
    }
    failure {
      echo 'The pipeline has failed.'
      slackSend(color: '#ff0000', message: "The pipeline has failed.")
    }
  }
}