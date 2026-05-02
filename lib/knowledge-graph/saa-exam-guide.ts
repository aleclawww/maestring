/**
 * AWS Certified Solutions Architect - Associate (SAA-C03)
 * Official exam guide content, in English. Sourced from the AWS exam guide
 * version 1.1 (April 2024). Pure data — rendered by /learn/exam-guide.
 */

export const EXAM_META = {
  code: 'SAA-C03',
  title: 'AWS Certified Solutions Architect — Associate',
  version: '1.1',
  passingScore: 720,
  scoreRange: '100 – 1000',
  scoredQuestions: 50,
  unscoredQuestions: 15,
  // Question formats from the guide
  questionTypes: [
    'Multiple choice — one correct answer, three distractors',
    'Multiple response — two or more correct answers from five or more options',
  ],
  // Recommended candidate profile
  recommendedExperience:
    'At least 1 year of hands-on experience designing cloud solutions that use AWS services.',
} as const

export interface DomainTask {
  id: string                   // e.g. "1.1"
  title: string
  knowledge: string[]
  skills: string[]
}

export interface ExamDomain {
  number: number
  title: string
  weightPercent: number
  tasks: DomainTask[]
}

export const EXAM_DOMAINS: ExamDomain[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    number: 1,
    title: 'Design Secure Architectures',
    weightPercent: 30,
    tasks: [
      {
        id: '1.1',
        title: 'Design secure access to AWS resources',
        knowledge: [
          'Access controls and management across multiple accounts',
          'AWS federated identity and access services (e.g., AWS IAM, AWS IAM Identity Center / AWS SSO)',
          'AWS global infrastructure (e.g., AWS Regions, Availability Zones)',
          'AWS security best practices (e.g., principle of least privilege)',
          'The AWS shared responsibility model',
        ],
        skills: [
          'Apply AWS security best practices to IAM users and root users (e.g., MFA)',
          'Design a flexible authorization model that includes IAM users, groups, roles, and policies',
          'Design a role-based access control strategy (e.g., AWS STS, role switching, cross-account access)',
          'Design a multi-account security strategy (e.g., AWS Control Tower, Service Control Policies)',
          'Determine appropriate use of resource policies for AWS services',
          'Determine when to federate a directory service with IAM roles',
        ],
      },
      {
        id: '1.2',
        title: 'Design secure workloads and applications',
        knowledge: [
          'Application configuration and credentials security',
          'AWS service endpoints',
          'Controlling ports, protocols, and network traffic on AWS',
          'Secure application access',
          'Security services with appropriate use cases (e.g., Amazon Cognito, GuardDuty, Macie)',
          'Threat vectors external to AWS (e.g., DDoS, SQL injection)',
        ],
        skills: [
          'Design VPC architectures with security components (security groups, route tables, NACLs, NAT gateways)',
          'Determine network segmentation strategies (e.g., public vs. private subnets)',
          'Integrate AWS services to secure applications (Shield, WAF, IAM Identity Center, Secrets Manager)',
          'Secure external network connections to and from the AWS Cloud (VPN, Direct Connect)',
        ],
      },
      {
        id: '1.3',
        title: 'Determine appropriate data security controls',
        knowledge: [
          'Data access and governance',
          'Data recovery',
          'Data retention and classification',
          'Encryption and appropriate key management',
        ],
        skills: [
          'Align AWS technologies to meet compliance requirements',
          'Encrypt data at rest (e.g., AWS KMS)',
          'Encrypt data in transit (e.g., AWS Certificate Manager with TLS)',
          'Implement access policies for encryption keys',
          'Implement data backups and replications',
          'Implement access, lifecycle, and protection policies for data',
          'Rotate encryption keys and renew certificates',
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    number: 2,
    title: 'Design Resilient Architectures',
    weightPercent: 26,
    tasks: [
      {
        id: '2.1',
        title: 'Design scalable and loosely coupled architectures',
        knowledge: [
          'API creation and management (e.g., Amazon API Gateway, REST APIs)',
          'AWS managed services with appropriate use cases (Transfer Family, Amazon SQS, Secrets Manager)',
          'Caching strategies',
          'Design principles for microservices (stateless vs. stateful workloads)',
          'Event-driven architectures',
          'Horizontal scaling vs. vertical scaling',
          'How to use edge accelerators (e.g., CDN)',
          'How to migrate applications to containers',
          'Load balancing concepts (e.g., Application Load Balancer)',
          'Multi-tier architectures',
          'Queueing and messaging concepts (e.g., publish/subscribe)',
          'Serverless technologies and patterns (e.g., AWS Fargate, AWS Lambda)',
          'Storage types with associated characteristics (object, file, block)',
          'Container provisioning (Amazon ECS, Amazon EKS)',
          'When to use read replicas',
          'Workflow provisioning (e.g., AWS Step Functions)',
        ],
        skills: [
          'Design event-driven, microservice, and/or multi-tier architectures based on requirements',
          'Determine scaling strategies for components used in an architecture design',
          'Determine the AWS services required to achieve loose coupling based on requirements',
          'Determine when to use containers',
          'Determine when to use serverless technologies and patterns',
          'Recommend appropriate compute, storage, networking, and database technologies based on requirements',
          'Use purpose-built AWS services for workloads',
        ],
      },
      {
        id: '2.2',
        title: 'Design highly available and/or fault-tolerant architectures',
        knowledge: [
          'AWS global infrastructure (Regions, Availability Zones, Amazon Route 53)',
          'AWS managed services with appropriate use cases (Amazon Comprehend, Amazon Polly)',
          'Basic networking concepts (e.g., route tables)',
          'Disaster recovery strategies (Backup and Restore, Pilot Light, Warm Standby, Active-Active failover; RPO and RTO)',
          'Distributed design patterns',
          'Failover strategies',
          'Immutable infrastructure',
          'Load balancing concepts',
          'Proxy concepts (e.g., Amazon RDS Proxy)',
          'Service quotas and throttling (e.g., how to configure Service Quotas for a workload in a standby environment)',
          'Storage options and characteristics (durability, replication)',
          'Workload visibility (e.g., AWS X-Ray)',
        ],
        skills: [
          'Determine automation strategies to ensure infrastructure integrity',
          'Determine the AWS services required to provide a highly available and/or fault-tolerant architecture across AWS Regions or Availability Zones',
          'Identify metrics based on business requirements to deliver a highly available solution',
          'Implement designs to mitigate single points of failure',
          'Implement strategies to ensure data durability and availability (e.g., backups)',
          'Select an appropriate DR strategy to meet business requirements',
          'Use AWS services that improve the reliability of legacy applications and applications not built for the cloud',
          'Use purpose-built AWS services for workloads',
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    number: 3,
    title: 'Design High-Performing Architectures',
    weightPercent: 24,
    tasks: [
      {
        id: '3.1',
        title: 'Determine high-performing and/or scalable storage solutions',
        knowledge: [
          'Hybrid storage solutions to meet business requirements',
          'Storage services with appropriate use cases (Amazon S3, Amazon EFS, Amazon EBS)',
          'Storage types with associated characteristics (object, file, block)',
        ],
        skills: [
          'Determine storage services and configurations that meet performance demands',
          'Determine storage services that can scale to accommodate future needs',
        ],
      },
      {
        id: '3.2',
        title: 'Design high-performing and elastic compute solutions',
        knowledge: [
          'AWS compute services with appropriate use cases (AWS Batch, Amazon EMR, AWS Fargate)',
          'Distributed computing concepts supported by AWS global infrastructure and edge services',
          'Queueing and messaging concepts (publish/subscribe)',
          'Scalability capabilities with appropriate use cases (Amazon EC2 Auto Scaling, AWS Auto Scaling)',
          'Serverless technologies and patterns (Lambda, Fargate)',
          'Container provisioning (Amazon ECS, Amazon EKS)',
        ],
        skills: [
          'Decouple workloads so that components can scale independently',
          'Identify metrics and conditions to perform scaling actions',
          'Select appropriate compute options and features (e.g., EC2 instance types) to meet business requirements',
          'Select appropriate resource type and size (e.g., the amount of Lambda memory) to meet business requirements',
        ],
      },
      {
        id: '3.3',
        title: 'Determine high-performing database solutions',
        knowledge: [
          'AWS global infrastructure (Regions, Availability Zones)',
          'Caching strategies and services (e.g., Amazon ElastiCache)',
          'Data access patterns (read-intensive vs. write-intensive)',
          'Database capacity planning (capacity units, instance types, provisioned IOPS)',
          'Database connections and proxies',
          'Database engines with appropriate use cases (heterogeneous and homogeneous migrations)',
          'Database replication (e.g., read replicas)',
          'Database types and services (serverless, relational vs. non-relational, in-memory)',
        ],
        skills: [
          'Configure read replicas to meet business requirements',
          'Design database architectures',
          'Determine an appropriate database engine (e.g., MySQL vs. PostgreSQL)',
          'Determine an appropriate database type (e.g., Amazon Aurora, Amazon DynamoDB)',
          'Integrate caching to meet business requirements',
        ],
      },
      {
        id: '3.4',
        title: 'Determine high-performing and/or scalable network architectures',
        knowledge: [
          'Edge networking services with appropriate use cases (Amazon CloudFront, AWS Global Accelerator)',
          'How to design a network architecture (subnet tiers, routing, IP addressing)',
          'Load balancing concepts',
          'Network connection options (AWS VPN, Direct Connect, AWS PrivateLink)',
        ],
        skills: [
          'Create a network topology for various architectures (global, hybrid, multi-tier)',
          'Determine network configurations that can scale to accommodate future needs',
          'Determine the appropriate placement of resources to meet business requirements',
          'Select the appropriate load balancing strategy',
        ],
      },
      {
        id: '3.5',
        title: 'Determine high-performing data ingestion and transformation solutions',
        knowledge: [
          'Data analytics and visualization services with appropriate use cases (Amazon Athena, AWS Lake Formation, Amazon QuickSight)',
          'Data ingestion patterns (e.g., frequency)',
          'Data transfer services with appropriate use cases (AWS DataSync, AWS Storage Gateway)',
          'Data transformation services with appropriate use cases (AWS Glue)',
          'Secure access to ingestion access points',
          'Sizes and speeds needed to meet business requirements',
          'Streaming data services with appropriate use cases (e.g., Amazon Kinesis)',
        ],
        skills: [
          'Build and secure data lakes',
          'Design data streaming architectures',
          'Design data transfer solutions',
          'Implement visualization strategies',
          'Select appropriate compute options for data processing (e.g., Amazon EMR)',
          'Select appropriate configurations for ingestion',
          'Transform data between formats (e.g., .csv to .parquet)',
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    number: 4,
    title: 'Design Cost-Optimized Architectures',
    weightPercent: 20,
    tasks: [
      {
        id: '4.1',
        title: 'Design cost-optimized storage solutions',
        knowledge: [
          'Access options (e.g., an S3 bucket with Requester Pays object storage)',
          'AWS cost management service features (cost allocation tags, multi-account billing)',
          'AWS cost management tools with appropriate use cases (AWS Cost Explorer, AWS Budgets, AWS Cost and Usage Report)',
          'AWS storage services with appropriate use cases (Amazon FSx, Amazon EFS, Amazon S3, Amazon EBS)',
          'Backup strategies',
          'Block storage options (HDD volume types, SSD volume types)',
          'Data lifecycles',
          'Hybrid storage options (DataSync, Transfer Family, Storage Gateway)',
          'Storage access patterns',
          'Storage tiering (e.g., cold tiering for object storage)',
          'Storage types with associated characteristics (object, file, block)',
        ],
        skills: [
          'Design appropriate storage strategies (e.g., batch uploads to Amazon S3 vs. individual uploads)',
          'Determine the correct storage size for a workload',
          'Determine the lowest-cost method of transferring data for a workload to AWS storage',
          'Determine when storage Auto Scaling is required',
          'Manage S3 object lifecycles',
          'Select the appropriate backup and/or archival solution',
          'Select the appropriate service for data migration to storage services',
          'Select the appropriate storage tier',
          'Select the correct data lifecycle for storage',
          'Select the most cost-effective storage service for a workload',
        ],
      },
      {
        id: '4.2',
        title: 'Design cost-optimized compute solutions',
        knowledge: [
          'AWS cost management service features (cost allocation tags, multi-account billing)',
          'AWS cost management tools (Cost Explorer, AWS Budgets, AWS Cost and Usage Report)',
          'AWS global infrastructure (Regions, Availability Zones)',
          'AWS purchasing options (Spot Instances, Reserved Instances, Savings Plans)',
          'Distributed compute strategies (e.g., edge processing)',
          'Hybrid compute options (AWS Outposts, AWS Snowball Edge)',
          'Instance types, families, and sizes (memory optimized, compute optimized, virtualization)',
          'Optimization of compute use (containers, serverless computing, microservices)',
          'Scaling strategies (Auto Scaling, hibernation)',
        ],
        skills: [
          'Determine an appropriate load balancing strategy (ALB layer-7 vs. NLB layer-4 vs. GWLB)',
          'Determine appropriate scaling methods and strategies for elastic workloads (horizontal vs. vertical, EC2 hibernation)',
          'Determine cost-effective AWS compute services with appropriate use cases (Lambda, Amazon EC2, Fargate)',
          'Determine the required availability for different workload classes (production vs. non-production)',
          'Select the appropriate instance family for a workload',
          'Select the appropriate instance size for a workload',
        ],
      },
      {
        id: '4.3',
        title: 'Design cost-optimized database solutions',
        knowledge: [
          'AWS cost management service features',
          'AWS cost management tools',
          'Caching strategies',
          'Data retention policies',
          'Database capacity planning (e.g., capacity units)',
          'Database connections and proxies',
          'Database engines with appropriate use cases (heterogeneous vs. homogeneous migrations)',
          'Database replication (e.g., read replicas)',
          'Database types and services (relational vs. non-relational; Aurora or DynamoDB)',
        ],
        skills: [
          'Design appropriate backup and retention policies (e.g., snapshot frequency)',
          'Determine an appropriate database engine (MySQL vs. PostgreSQL)',
          'Determine cost-effective AWS database services with appropriate use cases (DynamoDB vs. Amazon RDS, serverless)',
          'Determine cost-effective AWS database types (e.g., time-series format, columnar format)',
          'Migrate database schemas and data to different locations and database engines',
        ],
      },
      {
        id: '4.4',
        title: 'Design cost-optimized network architectures',
        knowledge: [
          'AWS cost management service features',
          'AWS cost management tools',
          'Load balancing concepts',
          'NAT gateways (e.g., NAT instance vs. NAT gateway costs)',
          'Network connectivity (private lines, dedicated lines, VPN)',
          'Network routing, topology, and peering (AWS Transit Gateway, VPC peering)',
          'Network services with appropriate use cases (e.g., DNS)',
        ],
        skills: [
          'Configure appropriate NAT gateway types for a network (single shared NAT gateway vs. NAT gateways per AZ)',
          'Configure appropriate network connections (Direct Connect vs. VPN vs. Internet)',
          'Configure appropriate network routes to minimize transfer costs (region-to-region, AZ-to-AZ, private-to-public, Global Accelerator, VPC endpoints)',
          'Determine strategic needs for CDN and edge caching',
          'Review existing workloads for network optimizations',
          'Select an appropriate throttling strategy',
          'Select the appropriate bandwidth allocation for a network device (single VPN vs. multiple VPNs, Direct Connect speed)',
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// APPENDIX
// ─────────────────────────────────────────────────────────────────────────────

export const APPENDIX_TECHNOLOGIES_AND_CONCEPTS = [
  'Compute',
  'Cost management',
  'Database',
  'Disaster recovery',
  'High performance',
  'Management and governance',
  'Microservices and component delivery',
  'Migration and data transfer',
  'Networking, connectivity, and content delivery',
  'Resiliency',
  'Security',
  'Serverless and event-driven design principles',
  'Storage',
] as const

export interface ServiceCategory {
  category: string
  services: string[]
}

export const SERVICES_IN_SCOPE: ServiceCategory[] = [
  {
    category: 'Analytics',
    services: [
      'Amazon Athena',
      'AWS Data Exchange',
      'AWS Data Pipeline',
      'Amazon EMR',
      'AWS Glue',
      'Amazon Kinesis',
      'AWS Lake Formation',
      'Amazon Managed Streaming for Apache Kafka (Amazon MSK)',
      'Amazon OpenSearch Service',
      'Amazon QuickSight',
      'Amazon Redshift',
    ],
  },
  {
    category: 'Application Integration',
    services: [
      'Amazon AppFlow',
      'AWS AppSync',
      'Amazon EventBridge',
      'Amazon MQ',
      'Amazon Simple Notification Service (SNS)',
      'Amazon Simple Queue Service (SQS)',
      'AWS Step Functions',
    ],
  },
  {
    category: 'AWS Cost Management',
    services: ['AWS Budgets', 'AWS Cost and Usage Report', 'AWS Cost Explorer', 'Savings Plans'],
  },
  {
    category: 'Compute',
    services: [
      'AWS Batch',
      'Amazon EC2',
      'Amazon EC2 Auto Scaling',
      'AWS Elastic Beanstalk',
      'AWS Outposts',
      'AWS Serverless Application Repository',
      'VMware Cloud on AWS',
      'AWS Wavelength',
    ],
  },
  {
    category: 'Containers',
    services: [
      'Amazon ECS Anywhere',
      'Amazon EKS Anywhere',
      'Amazon EKS Distro',
      'Amazon Elastic Container Registry (ECR)',
      'Amazon Elastic Container Service (ECS)',
      'Amazon Elastic Kubernetes Service (EKS)',
    ],
  },
  {
    category: 'Database',
    services: [
      'Amazon Aurora',
      'Amazon Aurora Serverless',
      'Amazon DocumentDB (with MongoDB compatibility)',
      'Amazon DynamoDB',
      'Amazon ElastiCache',
      'Amazon Keyspaces (for Apache Cassandra)',
      'Amazon Neptune',
      'Amazon Quantum Ledger Database (QLDB)',
      'Amazon RDS',
      'Amazon Redshift',
    ],
  },
  { category: 'Developer Tools', services: ['AWS X-Ray'] },
  {
    category: 'Frontend Web and Mobile',
    services: ['AWS Amplify', 'Amazon API Gateway', 'AWS Device Farm', 'Amazon Pinpoint'],
  },
  {
    category: 'Machine Learning',
    services: [
      'Amazon Comprehend',
      'Amazon Forecast',
      'Amazon Fraud Detector',
      'Amazon Kendra',
      'Amazon Lex',
      'Amazon Polly',
      'Amazon Rekognition',
      'Amazon SageMaker',
      'Amazon Textract',
      'Amazon Transcribe',
      'Amazon Translate',
    ],
  },
  {
    category: 'Management and Governance',
    services: [
      'AWS Auto Scaling',
      'AWS CloudFormation',
      'AWS CloudTrail',
      'Amazon CloudWatch',
      'AWS CLI',
      'AWS Compute Optimizer',
      'AWS Config',
      'AWS Control Tower',
      'AWS Health Dashboard',
      'AWS License Manager',
      'Amazon Managed Grafana',
      'Amazon Managed Service for Prometheus',
      'AWS Management Console',
      'AWS Organizations',
      'AWS Proton',
      'AWS Service Catalog',
      'AWS Systems Manager',
      'AWS Trusted Advisor',
      'AWS Well-Architected Tool',
    ],
  },
  {
    category: 'Media Services',
    services: ['Amazon Elastic Transcoder', 'Amazon Kinesis Video Streams'],
  },
  {
    category: 'Migration and Transfer',
    services: [
      'AWS Application Discovery Service',
      'AWS Application Migration Service',
      'AWS Database Migration Service (DMS)',
      'AWS DataSync',
      'AWS Migration Hub',
      'AWS Snow Family',
      'AWS Transfer Family',
    ],
  },
  {
    category: 'Networking and Content Delivery',
    services: [
      'AWS Client VPN',
      'Amazon CloudFront',
      'AWS Direct Connect',
      'Elastic Load Balancing (ELB)',
      'AWS Global Accelerator',
      'AWS PrivateLink',
      'Amazon Route 53',
      'AWS Site-to-Site VPN',
      'AWS Transit Gateway',
      'Amazon VPC',
    ],
  },
  {
    category: 'Security, Identity, and Compliance',
    services: [
      'AWS Artifact',
      'AWS Audit Manager',
      'AWS Certificate Manager (ACM)',
      'AWS CloudHSM',
      'Amazon Cognito',
      'Amazon Detective',
      'AWS Directory Service',
      'AWS Firewall Manager',
      'Amazon GuardDuty',
      'AWS IAM Identity Center (AWS Single Sign-On)',
      'AWS Identity and Access Management (IAM)',
      'Amazon Inspector',
      'AWS Key Management Service (KMS)',
      'Amazon Macie',
      'AWS Network Firewall',
      'AWS Resource Access Manager (RAM)',
      'AWS Secrets Manager',
      'AWS Security Hub',
      'AWS Shield',
      'AWS WAF',
    ],
  },
  {
    category: 'Serverless',
    services: ['AWS AppSync', 'AWS Fargate', 'AWS Lambda'],
  },
  {
    category: 'Storage',
    services: [
      'AWS Backup',
      'Amazon Elastic Block Store (EBS)',
      'Amazon Elastic File System (EFS)',
      'Amazon FSx (for all types)',
      'Amazon S3',
      'Amazon S3 Glacier',
      'AWS Storage Gateway',
    ],
  },
]

export const SERVICES_OUT_OF_SCOPE: ServiceCategory[] = [
  { category: 'Analytics', services: ['Amazon CloudSearch'] },
  { category: 'Application Integration', services: ['Amazon Managed Workflows for Apache Airflow (MWAA)'] },
  { category: 'AR and VR', services: ['Amazon Sumerian'] },
  { category: 'Blockchain', services: ['Amazon Managed Blockchain'] },
  { category: 'Compute', services: ['Amazon Lightsail'] },
  { category: 'Database', services: ['Amazon RDS on VMware'] },
  {
    category: 'Developer Tools',
    services: [
      'AWS Cloud9',
      'AWS Cloud Development Kit (CDK)',
      'AWS CloudShell',
      'AWS CodeArtifact',
      'AWS CodeBuild',
      'AWS CodeCommit',
      'AWS CodeDeploy',
      'Amazon CodeGuru',
      'AWS CodeStar',
      'Amazon Corretto',
      'AWS Fault Injection Simulator (FIS)',
      'AWS Tools and SDKs',
    ],
  },
  { category: 'Frontend Web and Mobile', services: ['Amazon Location Service'] },
  { category: 'Game Tech', services: ['Amazon GameLift', 'Amazon Lumberyard'] },
  { category: 'Internet of Things', services: ['All services'] },
  {
    category: 'Machine Learning',
    services: [
      'Apache MXNet on AWS',
      'Amazon Augmented AI (A2I)',
      'AWS DeepComposer',
      'AWS Deep Learning AMI (DLAMI)',
      'AWS Deep Learning Containers',
      'AWS DeepLens',
      'AWS DeepRacer',
      'Amazon DevOps Guru',
      'Amazon Elastic Inference',
      'Amazon HealthLake',
      'AWS Inferentia',
      'Amazon Lookout for Equipment',
      'Amazon Lookout for Metrics',
      'Amazon Lookout for Vision',
      'Amazon Monitron',
      'AWS Panorama',
      'Amazon Personalize',
      'PyTorch on AWS',
      'Amazon SageMaker Data Wrangler',
      'Amazon SageMaker Ground Truth',
      'TensorFlow on AWS',
    ],
  },
  {
    category: 'Management and Governance',
    services: [
      'AWS Chatbot',
      'AWS Console Mobile Application',
      'AWS Distro for OpenTelemetry',
      'AWS OpsWorks',
    ],
  },
  {
    category: 'Media Services',
    services: [
      'AWS Elemental Appliances and Software',
      'AWS Elemental MediaConnect',
      'AWS Elemental MediaConvert',
      'AWS Elemental MediaLive',
      'AWS Elemental MediaPackage',
      'AWS Elemental MediaStore',
      'AWS Elemental MediaTailor',
      'Amazon Interactive Video Service (IVS)',
    ],
  },
  { category: 'Migration and Transfer', services: ['Migration Evaluator'] },
  { category: 'Networking and Content Delivery', services: ['AWS App Mesh', 'AWS Cloud Map'] },
  { category: 'Quantum Technologies', services: ['Amazon Braket'] },
  { category: 'Robotics', services: ['AWS RoboMaker'] },
  { category: 'Satellite', services: ['AWS Ground Station'] },
]
