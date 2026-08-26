import ExpoModulesCore
import Foundation

private let policyVersion = "ios-sqlite-exclusion-v1"

public final class ChartPathBackupPolicyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ChartPathBackupPolicy")

    AsyncFunction("ensureSQLiteDirectoryExcludedAsync") { () throws -> [String: Any] in
      try self.verifyConfiguredPolicyVersion()
      var sqliteDirectory = try self.sqliteDirectoryURL(createIfMissing: true)
      var resourceValues = URLResourceValues()
      resourceValues.isExcludedFromBackup = true
      try sqliteDirectory.setResourceValues(resourceValues)

      let excluded = try self.isExcludedFromBackup(sqliteDirectory)
      if !excluded {
        throw NSError(
          domain: "ChartPathBackupPolicy",
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "The SQLite backup exclusion could not be verified."]
        )
      }
      return self.result(excluded: excluded)
    }

    AsyncFunction("getSQLiteDirectoryBackupPolicyAsync") { () throws -> [String: Any] in
      try self.verifyConfiguredPolicyVersion()
      let sqliteDirectory = try self.sqliteDirectoryURL(createIfMissing: false)
      return self.result(excluded: try self.isExcludedFromBackup(sqliteDirectory))
    }
  }

  private func sqliteDirectoryURL(createIfMissing: Bool) throws -> URL {
    guard let documentsDirectory = FileManager.default.urls(
      for: .documentDirectory,
      in: .userDomainMask
    ).first else {
      throw NSError(
        domain: "ChartPathBackupPolicy",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "The application Documents directory is unavailable."]
      )
    }

    let sqliteDirectory = documentsDirectory.appendingPathComponent("SQLite", isDirectory: true)
    if createIfMissing {
      try FileManager.default.createDirectory(
        at: sqliteDirectory,
        withIntermediateDirectories: true
      )
    }
    return sqliteDirectory
  }

  private func isExcludedFromBackup(_ directory: URL) throws -> Bool {
    let values = try directory.resourceValues(forKeys: [.isExcludedFromBackupKey])
    return values.isExcludedFromBackup == true
  }

  private func verifyConfiguredPolicyVersion() throws {
    let configuredVersion = Bundle.main.object(
      forInfoDictionaryKey: "ChartPathBackupPolicyVersion"
    ) as? String
    if configuredVersion != policyVersion {
      throw NSError(
        domain: "ChartPathBackupPolicy",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "The configured backup policy version is invalid."]
      )
    }
  }

  private func result(excluded: Bool) -> [String: Any] {
    return [
      "directoryKind": "documents-sqlite",
      "excluded": excluded,
      "policyVersion": policyVersion,
    ]
  }
}
