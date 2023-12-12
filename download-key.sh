#!/usr/bin/env bash

echo "Downloading outputs"
keyParId=$(jq -r '.AwsEc2SelenoidStack.KeyPairName' outputs.json)

echo "Checking key pair $keyParId"
aws ssm get-parameter --name "/ec2/keypair/$keyParId" >/dev/null  || exit 1

echo "Downloading key pair $keyParId"
aws ssm get-parameter --name "/ec2/keypair/$keyParId" --with-decryption --query "Parameter.Value" --output text >key.pem

echo "Setting permissions"
chmod 400 key.pem
