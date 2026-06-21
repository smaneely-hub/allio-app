import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const gradlePath = path.join(repoRoot, 'android', 'app', 'build.gradle')
const lockPath = path.join(repoRoot, 'android', 'release-version.json')

const gradle = fs.readFileSync(gradlePath, 'utf8')
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))

const versionCodeMatch = gradle.match(/versionCode\s+(\d+)/)
const versionNameMatch = gradle.match(/versionName\s+"([^"]+)"/)

if (!versionCodeMatch || !versionNameMatch) {
  console.error('Could not parse Android versionCode/versionName from android/app/build.gradle')
  process.exit(1)
}

const currentCode = Number(versionCodeMatch[1])
const currentName = versionNameMatch[1]
const lastCode = Number(lock.lastReleasedVersionCode)

if (!Number.isFinite(currentCode) || !Number.isFinite(lastCode)) {
  console.error('Android release version metadata is invalid.')
  process.exit(1)
}

if (currentCode <= lastCode) {
  console.error(`Android release guard failed: versionCode ${currentCode} must be greater than last released versionCode ${lastCode}.`)
  console.error('Bump android/app/build.gradle and update android/release-version.json when preparing a new upload build.')
  process.exit(1)
}

console.log(`Android release guard passed: versionCode ${currentCode} > last released ${lastCode} (${lock.lastReleasedVersionName || 'unknown'}).`)
console.log(`Current versionName: ${currentName}`)
