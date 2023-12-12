#!/usr/bin/env bash

echo "Downloading outputs"
instance=$(jq -r '.AwsEc2SelenoidStack.InstanceId' outputs.json)

echo "Restarting instance $instance"
aws ec2 reboot-instances --instance-ids $instance