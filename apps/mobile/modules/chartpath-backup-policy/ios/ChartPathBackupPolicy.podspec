require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ChartPathBackupPolicy'
  s.version        = package['version']
  s.summary        = 'ChartPath durable SQLite backup policy'
  s.description    = 'Applies and verifies the iOS backup exclusion for ChartPath SQLite data.'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'ChartPath'
  s.homepage       = 'https://github.com/P0RTNOY/ChartPath'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/P0RTNOY/ChartPath.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
