pipeline {
    agent any

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', 
                url: 'https://github.com/Poojitham-2244/notes'
            }
        }

        stage('Build') {
            steps {
                sh 'echo "Build Started"'
                sh 'pwd'
                sh 'ls'
            }
        }
    }
}
