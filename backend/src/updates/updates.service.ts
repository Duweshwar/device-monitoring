import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PolicyService } from '../policy/policy.service';

export interface CreateReleaseDto {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sha256: string;
  isMandatory: boolean;
  releaseNotes: string;
}

export interface TriggerUpdateDto {
  deviceId: string;
  releaseId?: string;
}

export interface ProgressReportDto {
  jobId: string;
  deviceId: string;
  status: 'PENDING' | 'DOWNLOADING' | 'INSTALLING' | 'STAGED_FOR_DIALER' | 'COMPLETED' | 'FAILED';
  progress: number;
  errorMessage?: string;
}

@Injectable()
export class UpdatesService {
  constructor(@Optional() private readonly policyService?: PolicyService) {}

  // In-Memory store fallback for demo & dev environment
  private releases = [
    {
      id: 'rel_v820',
      versionCode: 220,
      versionName: 'v8.2.0',
      apkUrl: 'https://cdn.parantelguard.com/apk/agent-v8.2.0.apk',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      isMandatory: false,
      releaseNotes: 'Call Recording separation, location triangulation enhancement, memory optimization.',
      createdAt: new Date()
    }
  ];

  private updateJobs = new Map<string, any>();

  // 1. Super Admin Releases New Version
  async createRelease(dto: CreateReleaseDto) {
    const existing = this.releases.find(r => r.versionCode === dto.versionCode);
    if (existing) {
      throw new BadRequestException(`Version code ${dto.versionCode} already exists.`);
    }

    const newRelease = {
      id: `rel_${dto.versionCode}`,
      ...dto,
      createdAt: new Date()
    };

    this.releases.push(newRelease);
    console.log(`[SuperAdmin OTA] Published Release ${dto.versionName} (Build ${dto.versionCode}) - Mandatory: ${dto.isMandatory}`);
    return newRelease;
  }

  // 2. Android Agent Checks for Available Updates on Check-In
  async checkDeviceUpdate(deviceId: string, currentVersionCode: number) {
    const latestRelease = this.releases[this.releases.length - 1];

    if (!latestRelease || currentVersionCode >= latestRelease.versionCode) {
      return { hasUpdate: false, message: 'Device is up to date' };
    }

    // Auto-dispatch if Super Admin enforced a Mandatory release
    const isForced = latestRelease.isMandatory;

    return {
      hasUpdate: true,
      isMandatory: isForced,
      latestRelease: {
        versionCode: latestRelease.versionCode,
        versionName: latestRelease.versionName,
        apkUrl: latestRelease.apkUrl,
        sha256: latestRelease.sha256,
        releaseNotes: latestRelease.releaseNotes
      }
    };
  }

  // 3. Parent Dashboard Triggers Optional OTA Update
  async triggerDeviceUpdate(dto: TriggerUpdateDto) {
    const targetRelease = dto.releaseId 
      ? this.releases.find(r => r.id === dto.releaseId)
      : this.releases[this.releases.length - 1];

    if (!targetRelease) {
      throw new NotFoundException('Release not found');
    }

    const jobId = `job_${Date.now()}`;
    const updateJob = {
      id: jobId,
      deviceId: dto.deviceId,
      releaseId: targetRelease.id,
      versionName: targetRelease.versionName,
      status: 'PENDING',
      progress: 0,
      createdAt: new Date()
    };

    this.updateJobs.set(jobId, updateJob);

    // Emit Instant Real-Time SSE REMOTE_UPDATE Event to Target Android Phone
    if (this.policyService) {
      this.policyService.policyEvents$.next({
        deviceId: dto.deviceId,
        type: 'MEDIA',
        timestamp: Date.now(),
        payload: {
          action: 'REMOTE_UPDATE',
          jobId,
          versionCode: targetRelease.versionCode,
          versionName: targetRelease.versionName,
          apkUrl: targetRelease.apkUrl,
          sha256: targetRelease.sha256,
          isMandatory: targetRelease.isMandatory
        }
      });
    }

    console.log(`[C2 SSE Dispatch] Sent REMOTE_UPDATE command to Device ${dto.deviceId} for ${targetRelease.versionName} (Job ${jobId})`);

    return {
      success: true,
      jobId,
      message: `OTA Update command dispatched to device ${dto.deviceId}`,
      payload: {
        command: 'REMOTE_UPDATE',
        versionCode: targetRelease.versionCode,
        versionName: targetRelease.versionName,
        apkUrl: targetRelease.apkUrl,
        sha256: targetRelease.sha256,
        isMandatory: targetRelease.isMandatory
      }
    };
  }

  // 4. Android Agent Telemetry Report Callback
  async reportProgress(dto: ProgressReportDto) {
    const job = this.updateJobs.get(dto.jobId) || { id: dto.jobId, deviceId: dto.deviceId };

    job.status = dto.status;
    job.progress = dto.progress;
    if (dto.errorMessage) job.errorMessage = dto.errorMessage;
    job.updatedAt = new Date();

    this.updateJobs.set(dto.jobId, job);
    console.log(`[OTA Telemetry] Device ${dto.deviceId} -> Job ${dto.jobId}: Status=${dto.status} (${dto.progress}%)`);

    return { received: true, status: dto.status };
  }

  // 5. Query Recent Releases
  async getReleases() {
    return this.releases;
  }

  // 6. Query Active Jobs
  async getActiveJobs() {
    return Array.from(this.updateJobs.values());
  }

  // 7. Upload New APK Release File
  async uploadRelease(
    filePath: string,
    fileSize: number,
    fileName: string,
    versionCodeStr: string,
    versionName: string,
    releaseNotes: string,
    isMandatoryStr: string,
    host: string
  ) {
    const fs = await import('fs');
    const crypto = await import('crypto');

    const versionCode = parseInt(versionCodeStr, 10) || Math.floor(Date.now() / 1000);
    const isMandatory = isMandatoryStr === 'true' || isMandatoryStr === '1';

    // Calculate SHA-256 Checksum
    const fileBuffer = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Build downloadable APK URL
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const apkUrl = `${protocol}://${host}/uploads/apk/${fileName}`;

    const newRelease = {
      id: `rel_${versionCode}`,
      versionCode,
      versionName: versionName || `v${versionCode}`,
      apkUrl,
      sha256,
      isMandatory,
      releaseNotes: releaseNotes || 'OTA Release patch update.',
      sizeBytes: fileSize,
      fileName,
      createdAt: new Date()
    };

    // Remove old release if existing with same versionCode
    this.releases = this.releases.filter(r => r.versionCode !== versionCode);
    this.releases.push(newRelease);

    console.log(`[SuperAdmin OTA Upload] Published APK ${newRelease.versionName} (${fileName}) - SHA256: ${sha256}`);
    return newRelease;
  }
}
