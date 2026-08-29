import ExpoModulesCore
import Foundation

public class LocalOnlyStorageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LocalOnlyStorage")

    AsyncFunction("excludeFromBackupAsync") { (path: String) throws -> Bool in
      let url: URL
      if path.hasPrefix("file://"), let fileURL = URL(string: path) {
        url = fileURL
      } else {
        url = URL(fileURLWithPath: path)
      }

      guard FileManager.default.fileExists(atPath: url.path) else {
        throw NSError(
          domain: "LocalOnlyStorage",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Cannot exclude a path that does not exist: \(url.path)"]
        )
      }

      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      var mutableURL = url
      try mutableURL.setResourceValues(values)

      let confirmed = try mutableURL.resourceValues(forKeys: [.isExcludedFromBackupKey])
      return confirmed.isExcludedFromBackup ?? false
    }
  }
}

