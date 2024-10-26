#!/bin/bash
yum update -y
yum install -y python3
sudo dnf install java-17-amazon-corretto -y
yum install -y git
yum install -y docker
service docker start
usermod -aG docker ec2-user
sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo dnf install postgresql15.x86_64 postgresql15-server -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
systemctl start docker
