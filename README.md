# linkedinproj
LinkedIn project
1) Create a key pair in .pem format also convert it in .ppk for later use (login into ec2).
2) Deploy cfn template.
3) Enter required parameters for cfn template.
4) Cross check all the resources deployment are successful.
5) All the resources details is automatically writen in .env file.
6) Required Softwere packages like python, java, git, docker, docker-compose. psql client in ec2 is automatically installed by user data 
   script of resourece EC2.
7) Creation and attachment of iam role to ec2 that has s3 full access permission is added to CFN template code.
8) Cloning git repository in ec2 is also taken care of by CFN Template code.
9) Cross check all files and un docker compose build command.
10) Run "docker-compose ps" command to check project status.
11) Check if all containers are up and running, resolve any issues if arises.
12) Access the app on ec2 ip:port on browser.
13) Put data in web page and check it in db table and in s3.

At Least i Tried Kinda Diagram![PROJ Diagram](https://github.com/user-attachments/assets/ebaa09a6-88d8-4e93-ac0a-80b75a0e5aa6)
