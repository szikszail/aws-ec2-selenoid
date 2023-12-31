import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsEc2SelenoidStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const keyPair = new ec2.CfnKeyPair(this, 'KeyPair', {
      keyName: 'selenoid-key-pair',
      keyType: 'ed25519',
    });

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      isDefault: true,
    });

    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4444), 'allow selenium access from the world');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'allow selenoid access from the world');

    const allUserData = new ec2.MultipartUserData();

    allUserData.addUserDataPart(ec2.UserData.custom(`
    #cloud-config
    cloud_final_modules:
      - [scripts-user, always]`))

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'yum update -y',
      'yum install -y docker',
      'service docker start',
      'usermod -a -G docker ec2-user',
      'mkdir -p /home/ec2-user/selenoid',
      'wget https://github.com/aerokube/cm/releases/download/1.8.5/cm_linux_amd64 -O /home/ec2-user/selenoid/cm',
      'chmod +x /home/ec2-user/selenoid/cm',
      '/home/ec2-user/selenoid/cm selenoid configure --browsers "chrome;MicrosoftEdge" --last-versions 2 --tmpfs 128',
      '/home/ec2-user/selenoid/cm selenoid start --vnc --tmpfs 128',
      '/home/ec2-user/selenoid/cm selenoid-ui start',
    );

    allUserData.addUserDataPart(userData, 'text/x-shellscript; charset="us-ascii"');

    const instance = new ec2.Instance(this, 'Instance', {
      vpc,
      userData: allUserData,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      keyName: keyPair.ref,
      role,
      securityGroup,
    });

    new cdk.CfnOutput(this, 'SelenoidIP', {
      value: instance.instancePublicIp,
    });
    new cdk.CfnOutput(this, 'SelenoidUrl', {
      value: `http://${instance.instancePublicIp}:8080`,
    });
    new cdk.CfnOutput(this, 'KeyPairName', {
      value: keyPair.attrKeyPairId,
    });
    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
    });
  }
}
