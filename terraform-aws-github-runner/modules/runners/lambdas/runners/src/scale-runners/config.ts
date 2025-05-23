import { getBoolean, shuffleArrayInPlace } from './utils';

export class Config {
  private static _instance: Config | undefined;

  readonly awsRegion: string;
  readonly awsRegionInstances: string[];
  readonly awsRegionsToVpcIds: Map<string, Array<string>>;
  readonly azToSubnetIds: Map<string, Array<string>>;
  readonly cantHaveIssuesLabels: string[];
  readonly datetimeDeploy: string | undefined;
  readonly enableOrganizationRunners: boolean;
  readonly environment: string;
  readonly ghesUrl: undefined | string;
  readonly githubAppClientId: string | undefined;
  readonly githubAppClientSecret: string | undefined;
  readonly githubAppId: string | undefined;
  readonly kmsKeyId: string | undefined;
  readonly lambdaTimeout: number;
  readonly launchTemplateNameLinux: string | undefined;
  readonly launchTemplateNameLinuxARM64: string | undefined;
  readonly launchTemplateNameLinuxNvidia: string | undefined;
  readonly launchTemplateNameWindows: string | undefined;
  readonly launchTemplateVersionLinux: string | undefined;
  readonly launchTemplateVersionLinuxARM64: string | undefined;
  readonly launchTemplateVersionLinuxNvidia: string | undefined;
  readonly launchTemplateVersionWindows: string | undefined;
  readonly maxRetryScaleUpRecord: number;
  readonly minAvailableRunners: number;
  readonly minimumRunningTimeInMinutes: number;
  readonly mustHaveIssuesLabels: string[];
  readonly redisEndpoint: string;
  readonly redisLogin: string;
  readonly retryScaleUpRecordDelayS: number;
  readonly retryScaleUpRecordJitterPct: number;
  readonly retryScaleUpRecordQueueUrl: string | undefined;
  readonly runnerGroupName: string | undefined;
  readonly runnersExtraLabels: undefined | string;
  readonly scaleConfigOrg: string;
  readonly scaleConfigRepo: string;
  readonly scaleConfigRepoPath: string;
  readonly scaleUpMinQueueTimeMinutes: number;
  readonly scaleUpChronRecordQueueUrl: string | undefined;
  readonly secretsManagerSecretsId: string | undefined;
  readonly sSMParamCleanupAgeDays: number;
  readonly sSMParamMaxCleanupAllowance: number;
  readonly subnetIdToAZ: Map<string, string>;
  readonly subnetIdToVpcId: Map<string, string>;
  readonly vpcIdToSecurityGroupIds: Map<string, Array<string>>;
  readonly vpcIdToSubnetIds: Map<string, Array<string>>;

  protected constructor() {
    this.awsRegion = process.env.AWS_REGION || 'us-east-1';
    /* istanbul ignore next */
    this.awsRegionInstances = process.env.AWS_REGION_INSTANCES?.split(',').filter((w) => w.length > 0) || [];
    this.awsRegionsToVpcIds = this.getMapFromFlatEnv(process.env.AWS_REGIONS_TO_VPC_IDS);
    /* istanbul ignore next */
    this.cantHaveIssuesLabels = process.env.CANT_HAVE_ISSUES_LABELS?.split(',').filter((w) => w.length > 0) || [];
    /* istanbul ignore next */
    this.datetimeDeploy = process.env.DATETIME_DEPLOY ? process.env.DATETIME_DEPLOY : undefined;
    this.enableOrganizationRunners = getBoolean(process.env.ENABLE_ORGANIZATION_RUNNERS);
    this.environment = process.env.ENVIRONMENT || 'gh-ci';
    /* istanbul ignore next */
    this.ghesUrl = process.env.GHES_URL;
    this.githubAppClientId = process.env.GITHUB_APP_CLIENT_ID;
    this.githubAppClientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
    this.githubAppId = process.env.GITHUB_APP_ID;
    this.kmsKeyId = process.env.KMS_KEY_ID;
    /* istanbul ignore next */
    this.lambdaTimeout = Number(process.env.LAMBDA_TIMEOUT || '600');
    this.launchTemplateNameLinux = process.env.LAUNCH_TEMPLATE_NAME_LINUX;
    this.launchTemplateNameLinuxNvidia = process.env.LAUNCH_TEMPLATE_NAME_LINUX_NVIDIA;
    this.launchTemplateNameLinuxARM64 = process.env.LAUNCH_TEMPLATE_NAME_LINUX_ARM64;
    this.launchTemplateNameWindows = process.env.LAUNCH_TEMPLATE_NAME_WINDOWS;
    this.launchTemplateVersionLinux = process.env.LAUNCH_TEMPLATE_VERSION_LINUX;
    this.launchTemplateVersionLinuxNvidia = process.env.LAUNCH_TEMPLATE_VERSION_LINUX_NVIDIA;
    this.launchTemplateVersionLinuxARM64 = process.env.LAUNCH_TEMPLATE_VERSION_LINUX_ARM64;
    this.launchTemplateVersionWindows = process.env.LAUNCH_TEMPLATE_VERSION_WINDOWS;
    /* istanbul ignore next */
    this.maxRetryScaleUpRecord = Number(process.env.MAX_RETRY_SCALEUP_RECORD || '0');
    /* istanbul ignore next */
    const mnAvalRuns = Number(process.env.MIN_AVAILABLE_RUNNERS || '10');
    /* istanbul ignore next */
    this.minAvailableRunners = mnAvalRuns >= 0 ? mnAvalRuns : 0;
    /* istanbul ignore next */
    const mnRunMin = Number(process.env.MINIMUM_RUNNING_TIME_IN_MINUTES || '60');
    /* istanbul ignore next */
    this.minimumRunningTimeInMinutes = mnRunMin > 0 ? mnRunMin : 1;
    /* istanbul ignore next */
    this.mustHaveIssuesLabels = process.env.MUST_HAVE_ISSUES_LABELS?.split(',').filter((w) => w.length > 0) || [];
    /* istanbul ignore next */
    this.redisEndpoint = process.env.REDIS_ENDPOINT || '';
    /* istanbul ignore next */
    this.redisLogin = process.env.REDIS_LOGIN || '';
    /* istanbul ignore next */
    this.retryScaleUpRecordDelayS = Number(process.env.RETRY_SCALE_UP_RECORD_DELAY_S || '0');
    /* istanbul ignore next */
    this.retryScaleUpRecordJitterPct = Number(process.env.RETRY_SCALE_UP_RECORD_JITTER_PCT || '0');
    this.retryScaleUpRecordQueueUrl = process.env.RETRY_SCALE_UP_CHRON_RECORD_QUEUE_URL;
    this.scaleUpChronRecordQueueUrl = process.env.SCALE_UP_CHRON_HUD_QUERY_URL;
    this.scaleUpMinQueueTimeMinutes = process.env.SCALE_UP_MIN_QUEUE_TIME_MINUTES
      ? Number(process.env.SCALE_UP_MIN_QUEUE_TIME_MINUTES)
      : 30;
    this.runnerGroupName = process.env.RUNNER_GROUP_NAME;
    this.runnersExtraLabels = process.env.RUNNER_EXTRA_LABELS;
    this.scaleConfigOrg = process.env.SCALE_CONFIG_ORG || '';
    /* istanbul ignore next */
    this.scaleConfigRepo = process.env.SCALE_CONFIG_REPO || '';
    if (this.enableOrganizationRunners && !this.scaleConfigRepo) {
      throw new Error('SCALE_CONFIG_REPO is required when ENABLE_ORGANIZATION_RUNNERS is set');
    }
    this.scaleConfigRepoPath = process.env.SCALE_CONFIG_REPO_PATH || '.github/scale-config.yml';
    this.secretsManagerSecretsId = process.env.SECRETSMANAGER_SECRETS_ID;
    this.sSMParamCleanupAgeDays = Number(process.env.SSM_PARAM_CLEANUP_AGE_DAYS || '7');
    this.sSMParamMaxCleanupAllowance = Number(process.env.SSM_PARAM_CLEANUP_MAX_ALLOWLANCE || '50');
    this.vpcIdToSecurityGroupIds = this.getMapFromFlatEnv(process.env.VPC_ID_TO_SECURITY_GROUP_IDS);
    this.vpcIdToSubnetIds = this.getMapFromFlatEnv(process.env.VPC_ID_TO_SUBNET_IDS);
    this.subnetIdToVpcId = new Map();
    for (const [vpcId, subnetIds] of this.vpcIdToSubnetIds.entries()) {
      for (const subnetId of subnetIds) {
        this.subnetIdToVpcId.set(subnetId, vpcId);
      }
    }

    this.subnetIdToAZ = this.getSimpleMapFromFlatEnv(process.env.SUBNET_ID_TO_AZ);
    this.azToSubnetIds = new Map();
    for (const [subnetId, az] of this.subnetIdToAZ.entries()) {
      const arr = this.azToSubnetIds.get(az) || [];
      arr.push(subnetId);
      this.azToSubnetIds.set(az, arr);
    }
  }

  static get Instance(): Config {
    return this._instance || (this._instance = new this());
  }

  static resetConfig() {
    this._instance = undefined;
  }

  shuffledVPCsForAwsRegion(awsRegion: string): Array<string> {
    const arr = Array.from(this.awsRegionsToVpcIds.get(awsRegion) || []);
    return shuffleArrayInPlace(arr);
  }

  get shuffledAwsRegionInstances(): string[] {
    const regions: Set<string> = new Set(this.awsRegionsToVpcIds.keys());
    this.awsRegionInstances.forEach((region) => regions.add(region));
    return shuffleArrayInPlace(Array.from(regions));
  }

  get ghesUrlApi(): undefined | string {
    /* istanbul ignore next */
    return this.ghesUrl?.concat('/api/v3');
  }

  get ghesUrlHost(): string {
    /* istanbul ignore next */
    return this.ghesUrl ?? 'https://github.com';
  }

  protected getSimpleMapFromFlatEnv(envVar: string | undefined): Map<string, string> {
    const ret: Map<string, string> = new Map();

    (envVar?.split(',') || []).forEach((entry) => {
      const split = entry.split('|').filter((w) => w.length > 0);
      if (split.length == 2) {
        ret.set(split[0], split[1]);
      }
    });

    return ret;
  }

  protected getMapFromFlatEnv(envVar: string | undefined): Map<string, Array<string>> {
    const ret: Map<string, Array<string>> = new Map();

    (envVar?.split(',') || []).forEach((entry) => {
      const split = entry.split('|').filter((w) => w.length > 0);
      if (split.length == 2) {
        if (ret.has(split[0])) {
          /* istanbul ignore next */
          ret.get(split[0])?.push(split[1]);
        } else {
          ret.set(split[0], [split[1]]);
        }
      }
    });

    return ret;
  }
}
