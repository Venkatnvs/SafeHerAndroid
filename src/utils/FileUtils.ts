import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Utility functions for file operations
 */
export class FileUtils {
  private static externalStorageAvailable: boolean | null = null;

  /**
   * Request storage permissions for Android (including Android 11+)
   */
  static async requestStoragePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need these permissions
    }

    try {
      // For Android 11+ (API 30+), we need MANAGE_EXTERNAL_STORAGE for full external storage access
      const androidVersion = Platform.Version;
      const isAndroid11Plus = androidVersion >= 30;

      if (isAndroid11Plus) {
        // Check for MANAGE_EXTERNAL_STORAGE permission (Android 11+)
        const hasManagePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE
        );

        if (hasManagePermission) {
          return true;
        }

        // Request MANAGE_EXTERNAL_STORAGE permission
        const manageGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'SafeHer needs access to external storage to save emergency recordings where you can easily access them.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (manageGranted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        }
      }

      // Fallback to traditional storage permissions for older Android versions
      const hasWritePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      const hasReadPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );

      if (hasWritePermission && hasReadPermission) {
        return true;
      }

      // Request traditional permissions
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);

      const writeGranted = granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
      const readGranted = granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;

      return writeGranted && readGranted;
    } catch (error) {
      console.error('Error requesting storage permissions:', error);
      return false;
    }
  }

  /**
   * Check if external storage is available and accessible
   */
  static async isExternalStorageAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false; // iOS doesn't use external storage
    }

    if (this.externalStorageAvailable !== null) {
      return this.externalStorageAvailable;
    }

    try {
      // Check if external storage path exists
      if (!RNFS.ExternalStorageDirectoryPath) {
        console.log('External storage path not available');
        this.externalStorageAvailable = false;
        return false;
      }

      // For Android 11+, check if we have MANAGE_EXTERNAL_STORAGE permission
      const androidVersion = Platform.Version;
      const isAndroid11Plus = androidVersion >= 30;

      if (isAndroid11Plus) {
        const hasManagePermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE
        );
        
        if (!hasManagePermission) {
          console.log('MANAGE_EXTERNAL_STORAGE permission not granted for Android 11+');
          this.externalStorageAvailable = false;
          return false;
        }
      }

      // Try to create a test directory
      const testDir = `${RNFS.ExternalStorageDirectoryPath}/SafeHerTest/`;
      console.log('Testing external storage access at:', testDir);
      
      await RNFS.mkdir(testDir);
      
      // Clean up test directory
      await RNFS.unlink(testDir);
      
      console.log('External storage test successful');
      this.externalStorageAvailable = true;
      return true;
    } catch (error) {
      console.log('External storage not available:', error);
      this.externalStorageAvailable = false;
      return false;
    }
  }

  /**
   * Get the recordings directory path with external storage support
   */
  static async getRecordingsDirectory(): Promise<string> {
    if (Platform.OS === 'ios') {
      return `${RNFS.DocumentDirectoryPath}/recordings/`;
    } else {
      // For Android, try external storage first
      const hasPermissions = await this.requestStoragePermissions();
      const isExternalAvailable = await this.isExternalStorageAvailable();

      if (hasPermissions && isExternalAvailable) {
        console.log('Using external storage for recordings');
        return `${RNFS.ExternalStorageDirectoryPath}/SafeHer/Recordings/`;
      } else {
        console.log('Using internal storage fallback - external storage not available or permissions denied');
        return `${RNFS.DocumentDirectoryPath}/recordings/`;
      }
    }
  }

  /**
   * Check if MANAGE_EXTERNAL_STORAGE permission is needed and guide user
   */
  static async checkManageExternalStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    const androidVersion = Platform.Version;
    const isAndroid11Plus = androidVersion >= 30;

    if (isAndroid11Plus) {
      const hasManagePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE
      );

      if (!hasManagePermission) {
        console.log('MANAGE_EXTERNAL_STORAGE permission required for Android 11+');
        return false;
      }
    }

    return true;
  }

  /**
   * Get recording path for emergency audio files
   */
  static async getRecordingPath(filename: string = 'emergency_recording'): Promise<string> {
    // Ensure the recordings directory exists
    const recordingsDir = await this.getRecordingsDirectory();
    
    if (Platform.OS === 'ios') {
      return `${recordingsDir}${filename}.m4a`;
    } else {
      return `${recordingsDir}${filename}.mp3`;
    }
  }

  /**
   * Get a safe path for temporary files
   */
  static getTempPath(filename: string = 'temp_file'): string {
    return `${filename}.tmp`;
  }

  /**
   * Check if a path is safe to use (external storage paths are now allowed)
   */
  static isSafePath(path: string): boolean {
    // External storage paths are now allowed for recordings
    return true;
  }

  /**
   * Get a fallback path if the primary path fails
   */
  static getFallbackPath(originalPath: string): string {
    const extension = originalPath.split('.').pop();
    const baseName = originalPath.split('.').slice(0, -1).join('.');
    return `${baseName}_fallback.${extension}`;
  }

  /**
   * Generate timestamped filename for recordings
   */
  static getTimestampedFilename(type: 'audio', prefix: string = 'emergency'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}`;
  }

  /**
   * Get full path with timestamped filename
   */
  static async getTimestampedRecordingPath(type: 'audio'): Promise<string> {
    const filename = this.getTimestampedFilename(type);
    return this.getRecordingPath(filename);
  }

  /**
   * Get user-friendly recordings directory path for display
   */
  static getRecordingsDirectoryDisplayPath(): string {
    if (Platform.OS === 'ios') {
      return 'Documents/recordings/';
    } else {
      return 'App Storage/recordings/';
    }
  }

  /**
   * Ensure the recordings directory exists
   */
  static async ensureRecordingsDirectory(): Promise<void> {
    try {
      const recordingsDir = await this.getRecordingsDirectory();
      console.log('Creating recordings directory:', recordingsDir);
      
      const dirExists = await RNFS.exists(recordingsDir);
      if (!dirExists) {
        await RNFS.mkdir(recordingsDir);
        console.log('Recordings directory created successfully');
      } else {
        console.log('Recordings directory already exists');
      }
    } catch (error) {
      console.error('Error creating recordings directory:', error);
      throw new Error('Unable to create recordings directory. Please check app permissions.');
    }
  }
}
