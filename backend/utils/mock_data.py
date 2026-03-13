"""
Mock CloudTrail events for demo scenarios
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta


def generate_crypto_mining_scenario() -> List[Dict[str, Any]]:
    """
    Generate mock CloudTrail events for the crypto mining demo scenario
    
    Timeline:
    - Jan 15: IAM role 'contractor-temp' created
    - Jan 18: Security group modified to open SSH
    - Jan 18: Suspicious SSH connection from external IP
    - Jan 18-Feb 4: Multiple suspicious API calls
    - Feb 4: Crypto mining detected (GuardDuty alert)
    """
    
    base_time = datetime(2025, 1, 15, 14, 23, 0)
    
    events = [
        # Event 1: IAM role created
        {
            "eventVersion": "1.08",
            "eventTime": base_time.isoformat() + "Z",
            "eventName": "CreateRole",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.100",
            "userAgent": "aws-cli/2.13.0",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/admin",
                "accountId": "123456789012",
                "userName": "admin@company.com"
            },
            "requestParameters": {
                "roleName": "contractor-temp",
                "description": "Temporary role for contractor work",
                "maxSessionDuration": 43200,
                "assumeRolePolicyDocument": {
                    "Version": "2012-10-17",
                    "Statement": [{
                        "Effect": "Allow",
                        "Principal": {"AWS": "arn:aws:iam::123456789012:root"},
                        "Action": "sts:AssumeRole"
                    }]
                }
            },
            "responseElements": {
                "role": {
                    "roleId": "AROAI23HXW2X5EXAMPLE",
                    "roleName": "contractor-temp",
                    "arn": "arn:aws:iam::123456789012:role/contractor-temp"
                }
            }
        },
        
        # Event 2: Attach admin policy to role (suspicious)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=15)).isoformat() + "Z",
            "eventName": "AttachRolePolicy",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.100",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/admin",
                "accountId": "123456789012",
                "userName": "admin@company.com"
            },
            "requestParameters": {
                "roleName": "contractor-temp",
                "policyArn": "arn:aws:iam::aws:policy/AdministratorAccess"
            }
        },
        
        # Event 3: Security group modified (3 days later)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=3, hours=19, minutes=45)).isoformat() + "Z",
            "eventName": "AuthorizeSecurityGroupIngress",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.45",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAI23HXW2X5EXAMPLE:contractor-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/contractor-temp/contractor-session",
                "accountId": "123456789012",
                "sessionContext": {
                    "sessionIssuer": {
                        "type": "Role",
                        "principalId": "AROAI23HXW2X5EXAMPLE",
                        "arn": "arn:aws:iam::123456789012:role/contractor-temp"
                    }
                }
            },
            "requestParameters": {
                "groupId": "sg-abc123",
                "ipPermissions": {
                    "items": [{
                        "ipProtocol": "tcp",
                        "fromPort": 22,
                        "toPort": 22,
                        "ipRanges": {
                            "items": [{"cidrIp": "0.0.0.0/0"}]
                        }
                    }]
                }
            },
            "responseElements": {
                "securityGroupRuleSet": {
                    "items": [{
                        "groupId": "sg-abc123",
                        "securityGroupRuleId": "sgr-12345"
                    }]
                }
            }
        },
        
        # Event 4: SSH connection attempt (minutes later)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=3, hours=20, minutes=12)).isoformat() + "Z",
            "eventName": "ConsoleLogin",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.45",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAI23HXW2X5EXAMPLE:attacker-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/contractor-temp/attacker-session",
                "accountId": "123456789012"
            },
            "responseElements": {
                "ConsoleLogin": "Success"
            }
        },
        
        # Event 5: Describe instances (reconnaissance)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=3, hours=20, minutes=15)).isoformat() + "Z",
            "eventName": "DescribeInstances",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.45",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAI23HXW2X5EXAMPLE:attacker-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/contractor-temp/attacker-session",
                "accountId": "123456789012"
            }
        },
        
        # Event 6: Run instances (crypto mining instance)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=3, hours=20, minutes=30)).isoformat() + "Z",
            "eventName": "RunInstances",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.45",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAI23HXW2X5EXAMPLE:attacker-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/contractor-temp/attacker-session",
                "accountId": "123456789012"
            },
            "requestParameters": {
                "instanceType": "c5.4xlarge",
                "minCount": 5,
                "maxCount": 5,
                "imageId": "ami-0abcdef1234567890"
            },
            "responseElements": {
                "instancesSet": {
                    "items": [
                        {"instanceId": "i-abc123"},
                        {"instanceId": "i-abc124"},
                        {"instanceId": "i-abc125"},
                        {"instanceId": "i-abc126"},
                        {"instanceId": "i-abc127"}
                    ]
                }
            }
        },
        
        # Event 7: Modify other security groups
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=4, hours=2, minutes=15)).isoformat() + "Z",
            "eventName": "AuthorizeSecurityGroupIngress",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.45",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAI23HXW2X5EXAMPLE:attacker-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/contractor-temp/attacker-session",
                "accountId": "123456789012"
            },
            "requestParameters": {
                "groupId": "sg-def456",
                "ipPermissions": {
                    "items": [{
                        "ipProtocol": "tcp",
                        "fromPort": 3389,
                        "toPort": 3389,
                        "ipRanges": {
                            "items": [{"cidrIp": "0.0.0.0/0"}]
                        }
                    }]
                }
            }
        },
        
        # Event 8: Create access keys (persistence)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=4, hours=3, minutes=0)).isoformat() + "Z",
            "eventName": "CreateAccessKey",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.45",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAI23HXW2X5EXAMPLE:attacker-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/contractor-temp/attacker-session",
                "accountId": "123456789012"
            },
            "requestParameters": {
                "userName": "backup-user"
            },
            "responseElements": {
                "accessKey": {
                    "accessKeyId": "AKIAI44QH8DHBEXAMPLE",
                    "status": "Active"
                }
            }
        },
        
        # Event 9: GuardDuty finding (detection - current time)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=20)).isoformat() + "Z",
            "eventName": "GuardDutyFinding",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "guardduty.amazonaws.com",
            "eventSource": "guardduty.amazonaws.com",
            "eventCategory": "Security Finding",
            "findingType": "CryptoCurrency:EC2/BitcoinTool.B!DNS",
            "severity": 8.0,
            "resource": {
                "instanceDetails": {
                    "instanceId": "i-abc123",
                    "instanceType": "c5.4xlarge"
                }
            },
            "service": {
                "serviceName": "guardduty",
                "detectorId": "abc123",
                "action": {
                    "actionType": "NETWORK_CONNECTION",
                    "networkConnectionAction": {
                        "remoteIpDetails": {
                            "ipAddressV4": "203.0.113.45"
                        }
                    }
                }
            },
            "title": "EC2 instance is querying a domain name associated with cryptocurrency mining activity",
            "description": "EC2 instance i-abc123 is querying a domain name associated with Bitcoin mining pools"
        }
    ]
    
    return events


def generate_data_exfiltration_scenario() -> List[Dict[str, Any]]:
    """
    Generate mock CloudTrail events for data exfiltration scenario
    
    Timeline:
    - Feb 1: Suspicious S3 access from external IP
    - Feb 1: Multiple large data downloads
    - Feb 1: Unusual access pattern detected
    """
    base_time = datetime(2025, 2, 1, 10, 0, 0)
    
    events = [
        # Event 1: Initial suspicious access
        {
            "eventVersion": "1.08",
            "eventTime": base_time.isoformat() + "Z",
            "eventName": "GetObject",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.42",
            "userAgent": "aws-cli/2.13.0",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/data-analyst",
                "accountId": "123456789012",
                "userName": "data-analyst"
            },
            "requestParameters": {
                "bucketName": "company-sensitive-data",
                "key": "customer-pii/database-export.csv"
            },
            "responseElements": {
                "x-amz-request-id": "EXAMPLE123456789"
            },
            "resources": [
                {
                    "type": "AWS::S3::Object",
                    "arn": "arn:aws:s3:::company-sensitive-data/customer-pii/database-export.csv"
                }
            ]
        },
        # Event 2: Multiple large downloads
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=5)).isoformat() + "Z",
            "eventName": "GetObject",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.42",
            "userAgent": "aws-cli/2.13.0",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/data-analyst",
                "accountId": "123456789012",
                "userName": "data-analyst"
            },
            "requestParameters": {
                "bucketName": "company-sensitive-data",
                "key": "financial-records/q4-2024.csv"
            },
            "responseElements": {
                "x-amz-request-id": "EXAMPLE123456790"
            },
            "resources": [
                {
                    "type": "AWS::S3::Object",
                    "arn": "arn:aws:s3:::company-sensitive-data/financial-records/q4-2024.csv"
                }
            ]
        },
        # Event 3: ListBucket to discover more files
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=10)).isoformat() + "Z",
            "eventName": "ListBucket",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.42",
            "userAgent": "aws-cli/2.13.0",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/data-analyst",
                "accountId": "123456789012",
                "userName": "data-analyst"
            },
            "requestParameters": {
                "bucketName": "company-sensitive-data",
                "prefix": "customer-pii/"
            },
            "responseElements": {
                "x-amz-request-id": "EXAMPLE123456791"
            },
            "resources": [
                {
                    "type": "AWS::S3::Bucket",
                    "arn": "arn:aws:s3:::company-sensitive-data"
                }
            ]
        }
    ]
    
    return events


def generate_privilege_escalation_scenario() -> List[Dict[str, Any]]:
    """
    Generate mock CloudTrail events for privilege escalation scenario
    
    Timeline:
    - Feb 10: IAM user with limited permissions
    - Feb 10: User attempts to assume admin role
    - Feb 10: Successful role assumption
    - Feb 10: User creates new IAM user with admin access
    """
    base_time = datetime(2025, 2, 10, 14, 0, 0)
    
    events = [
        # Event 1: Initial access with limited permissions
        {
            "eventVersion": "1.08",
            "eventTime": base_time.isoformat() + "Z",
            "eventName": "ConsoleLogin",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.50",
            "userAgent": "Mozilla/5.0",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/junior-dev",
                "accountId": "123456789012",
                "userName": "junior-dev"
            },
            "responseElements": {
                "ConsoleLogin": "Success"
            }
        },
        # Event 2: Attempt to assume admin role
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=15)).isoformat() + "Z",
            "eventName": "AssumeRole",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.50",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAI23HXW2X5EXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/junior-dev",
                "accountId": "123456789012",
                "userName": "junior-dev"
            },
            "requestParameters": {
                "roleArn": "arn:aws:iam::123456789012:role/AdminRole",
                "roleSessionName": "admin-session"
            },
            "responseElements": {
                "assumedRoleUser": {
                    "assumedRoleId": "AROAEXAMPLE:admin-session",
                    "arn": "arn:aws:sts::123456789012:assumed-role/AdminRole/admin-session"
                }
            }
        },
        # Event 3: Create new IAM user with admin access
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=30)).isoformat() + "Z",
            "eventName": "CreateUser",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.50",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAEXAMPLE:admin-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/AdminRole/admin-session",
                "accountId": "123456789012",
                "userName": "junior-dev"
            },
            "requestParameters": {
                "userName": "backdoor-admin"
            },
            "responseElements": {
                "user": {
                    "userId": "AIDAIEXAMPLE",
                    "userName": "backdoor-admin"
                }
            }
        },
        # Event 4: Attach admin policy to new user
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=32)).isoformat() + "Z",
            "eventName": "AttachUserPolicy",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "203.0.113.50",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAEXAMPLE:admin-session",
                "arn": "arn:aws:sts::123456789012:assumed-role/AdminRole/admin-session",
                "accountId": "123456789012"
            },
            "requestParameters": {
                "userName": "backdoor-admin",
                "policyArn": "arn:aws:iam::aws:policy/AdministratorAccess"
            }
        }
    ]
    
    return events


def generate_unauthorized_access_scenario() -> List[Dict[str, Any]]:
    """
    Generate mock CloudTrail events for unauthorized access scenario
    
    Timeline:
    - Feb 5: External IP accessing S3 bucket
    - Feb 5: Multiple failed authentication attempts
    - Feb 5: Successful access to sensitive data
    """
    base_time = datetime(2025, 2, 5, 8, 0, 0)
    
    events = [
        # Event 1: Failed authentication attempt
        {
            "eventVersion": "1.08",
            "eventTime": base_time.isoformat() + "Z",
            "eventName": "AssumeRole",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.100",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAIEXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/external-user",
                "accountId": "123456789012",
                "userName": "external-user"
            },
            "errorCode": "AccessDenied",
            "errorMessage": "User is not authorized to perform: sts:AssumeRole"
        },
        # Event 2: Successful S3 access with compromised credentials
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=5)).isoformat() + "Z",
            "eventName": "GetObject",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.100",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAIEXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/external-user",
                "accountId": "123456789012",
                "userName": "external-user"
            },
            "requestParameters": {
                "bucketName": "company-secrets",
                "key": "api-keys/production.env"
            },
            "resources": [
                {
                    "type": "AWS::S3::Object",
                    "arn": "arn:aws:s3:::company-secrets/api-keys/production.env"
                }
            ]
        },
        # Event 3: List bucket contents
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=10)).isoformat() + "Z",
            "eventName": "ListBucket",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.100",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAIEXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/external-user",
                "accountId": "123456789012",
                "userName": "external-user"
            },
            "requestParameters": {
                "bucketName": "company-secrets",
                "prefix": ""
            },
            "resources": [
                {
                    "type": "AWS::S3::Bucket",
                    "arn": "arn:aws:s3:::company-secrets"
                }
            ]
        }
    ]
    
    return events


def generate_shadow_ai_scenario() -> List[Dict[str, Any]]:
    """
    Generate mock CloudTrail events for Shadow AI / LLM Abuse scenario.
    MITRE ATLAS: AML.T0051 (Prompt injection), AML.T0024 (Data exfiltration via model).
    OWASP LLM Top 10: LLM01 - Prompt injection.
    
    Timeline:
    - Mar 1: InvokeModel from unknown/unexpected principal (shadow AI)
    - Mar 1: High-volume InvokeModel calls from non-approved app
    - Mar 1: InvokeModelWithResponseStream with suspicious model ID
    - Mar 2: GuardDuty / AI Security finding
    """
    base_time = datetime(2025, 3, 1, 9, 0, 0)
    
    events = [
        # Event 1: InvokeModel from unexpected principal (shadow AI)
        {
            "eventVersion": "1.08",
            "eventTime": base_time.isoformat() + "Z",
            "eventName": "InvokeModel",
            "eventSource": "bedrock.amazonaws.com",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "10.0.42.100",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAISHADOW:lambda-shadow-ai",
                "arn": "arn:aws:sts::123456789012:assumed-role/UnapprovedLambdaRole/lambda-shadow-ai",
                "accountId": "123456789012",
                "sessionContext": {
                    "sessionIssuer": {
                        "type": "Role",
                        "arn": "arn:aws:iam::123456789012:role/UnapprovedLambdaRole"
                    }
                }
            },
            "requestParameters": {
                "modelId": "amazon.nova-pro-v1:0",
                "inferenceConfig": {"maxTokens": 2048}
            },
            "responseElements": {"status": "Success"},
            "resources": [{"type": "AWS::Bedrock::Model", "arn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0"}]
        },
        # Event 2: High-volume InvokeModel (API abuse)
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(minutes=15)).isoformat() + "Z",
            "eventName": "InvokeModel",
            "eventSource": "bedrock.amazonaws.com",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "10.0.42.100",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAISHADOW:lambda-shadow-ai",
                "arn": "arn:aws:sts::123456789012:assumed-role/UnapprovedLambdaRole/lambda-shadow-ai",
                "accountId": "123456789012"
            },
            "requestParameters": {
                "modelId": "amazon.nova-pro-v1:0"
            },
            "responseElements": {"status": "Success"}
        },
        # Event 3: InvokeModelWithResponseStream — potential prompt injection vector
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(hours=2)).isoformat() + "Z",
            "eventName": "InvokeModelWithResponseStream",
            "eventSource": "bedrock.amazonaws.com",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "198.51.100.77",
            "userAgent": "python-requests/2.28.0",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAIEXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/dev-experiment",
                "accountId": "123456789012",
                "userName": "dev-experiment"
            },
            "requestParameters": {
                "modelId": "amazon.nova-2-lite-v1:0",
                "inferenceConfig": {"maxTokens": 4096}
            },
            "responseElements": {"status": "Success"}
        },
        # Event 4: Another InvokeModel from same shadow principal
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(hours=3, minutes=30)).isoformat() + "Z",
            "eventName": "InvokeModel",
            "eventSource": "bedrock.amazonaws.com",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "10.0.42.100",
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAISHADOW:lambda-shadow-ai",
                "arn": "arn:aws:sts::123456789012:assumed-role/UnapprovedLambdaRole/lambda-shadow-ai",
                "accountId": "123456789012"
            },
            "requestParameters": {"modelId": "amazon.nova-pro-v1:0"},
            "responseElements": {"status": "Success"}
        },
        # Event 5: AI Security / GuardDuty-style finding
        {
            "eventVersion": "1.08",
            "eventTime": (base_time + timedelta(days=1, hours=8)).isoformat() + "Z",
            "eventName": "InvokeModel",
            "eventSource": "bedrock.amazonaws.com",
            "awsRegion": "us-east-1",
            "sourceIPAddress": "10.0.42.100",
            "eventCategory": "Security Finding",
            "findingType": "AI:Bedrock/ShadowAI.UngovernedModelAccess",
            "severity": 8.5,
            "userIdentity": {
                "type": "AssumedRole",
                "principalId": "AROAISHADOW:lambda-shadow-ai",
                "arn": "arn:aws:sts::123456789012:assumed-role/UnapprovedLambdaRole/lambda-shadow-ai",
                "accountId": "123456789012"
            },
            "title": "Ungoverned Bedrock InvokeModel from non-approved principal",
            "description": "Lambda role UnapprovedLambdaRole invoked Nova Pro 47 times in 24h. Not in approved AI usage policy. MITRE ATLAS AML.T0016 (Capability theft), OWASP LLM01."
        }
    ]
    
    return events


# Default scenario for demo
DEFAULT_SCENARIO = generate_crypto_mining_scenario()
