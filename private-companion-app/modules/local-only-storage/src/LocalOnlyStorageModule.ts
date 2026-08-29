import { NativeModule, requireNativeModule } from 'expo';

declare class LocalOnlyStorageModule extends NativeModule {
  excludeFromBackupAsync(path: string): Promise<boolean>;
}

export default requireNativeModule<LocalOnlyStorageModule>('LocalOnlyStorage');

