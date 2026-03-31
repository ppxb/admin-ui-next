import { promises as fs } from 'node:fs'
import { join, normalize } from 'node:path'

const rootDir = process.cwd()

// 特殊目录，避免进入这些目录进行清理
const SKIP_DIRS = new Set(['.DS_Store', '.git', '.idea', '.vscode'])

class Semaphore {
  constructor(limit) {
    this.limit = limit
    this.queue = []
    this.active = 0
  }

  acquire() {
    return new Promise(resolve => {
      if (this.active < this.limit) {
        this.active++
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release() {
    this.active--
    if (this.queue.length) {
      this.active++
      this.queue.shift()
    }
  }
}

const sem = new Semaphore(10)

/**
 * 递归查找并删除目标目录
 * @param {string} currentDir - 当前遍历的目录路径
 * @param {Set<string>} targets - 要删除的目标集合
 * @param {number} depth - 当前递归深度
 */
async function cleanTargetsRecursively(currentDir, targets, depth = 0) {
  if (depth > 10) {
    console.warn(`Max recursion depth reached at: ${currentDir}`)
    return
  }

  let dirents
  try {
    dirents = await fs.readdir(currentDir, { withFileTypes: true })
  } catch (error) {
    console.warn(`Cannot read directory ${currentDir}: ${error.message}`)
    return
  }

  for (const dirent of dirents) {
    const item = dirent.name
    if (SKIP_DIRS.has(item)) continue

    const itemPath = normalize(join(currentDir, item))

    if (targets.has(item)) {
      await sem.acquire()
      try {
        await fs.rm(itemPath, { force: true, recursive: true })
        console.log(`✅ Deleted: ${itemPath}`)
      } catch (error) {
        if (error.code === 'ENOENT') continue
        if (error.code === 'EPERM' || error.code === 'EACCES') {
          console.error(`❌ Permission denied: ${itemPath}`)
        } else {
          console.error(`❌ Error deleting ${itemPath}: ${error.message}`)
        }
      } finally {
        sem.release()
      }
      continue
    }

    if (dirent.isDirectory()) {
      await cleanTargetsRecursively(itemPath, targets, depth + 1)
    }
  }
}

// 要删除的目录及文件名称
const targets = ['node_modules', 'dist', '.turbo', 'dist.zip']
const deleteLockFile = process.argv.includes('--del-lock')
if (deleteLockFile) {
  cleanupTargets.push('pnpm-lock.yaml')
}

const targetsSet = new Set(targets)
console.log(
  `🚀 Starting cleanup of targets: ${targets.join(', ')} from root: ${rootDir}`
)

const startTime = Date.now()

try {
  console.log('📊 Scanning for cleanup targets...')
  await cleanTargetsRecursively(rootDir, targetsSet)
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`✨ Cleanup process completed successfully in ${duration}s`)
} catch (error) {
  console.error(`💥 Unexpected error during cleanup: ${error.message}`)
  process.exit(1)
}
