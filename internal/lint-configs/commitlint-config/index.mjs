import { execSync } from 'node:child_process'

import { getPackagesSync } from '@vben/node-utils'

const { packages } = getPackagesSync()

const EXTRA_SCOPES = [
  'project',
  'style',
  'lint',
  'ci',
  'dev',
  'deploy',
  'other'
]

const allowedScopes = [
  ...packages.map(pkg => pkg.packageJson.name),
  ...EXTRA_SCOPES
]

function detectScopeFromGit() {
  const status = execSync('git status --porcelain || true').toString().trim()

  for (const line of status.split('\n')) {
    const match = line.replaceAll('/', '%%').match(/src%%([\w-]+)/)
    if (match) {
      return match[1].replace(/s$/, '')
    }
  }
  return undefined
}

const scopeComplete = detectScopeFromGit()

const TYPES = [
  'feat',
  'fix',
  'perf',
  'style',
  'docs',
  'test',
  'refactor',
  'build',
  'ci',
  'chore',
  'revert',
  'types',
  'release',
  'update',
  'workflow'
]

/**
 * @type {import('cz-git').UserConfig}
 */
const userConfig = {
  extends: ['@commitlint/config-conventional'],
  plugins: ['commitlint-plugin-function-rules'],
  prompt: {
    /**
     *  @use `pnpm commit :f`
     * */
    alias: {
      b: 'build: bump dependencies',
      c: 'chore: update config',
      f: 'docs: fix typos',
      r: 'docs: update README',
      s: 'style: update code format'
    },
    allowCustomIssuePrefixs: false,
    allowEmptyIssuePrefixs: false,
    customScopesAlign: scopeComplete ? 'bottom' : 'top',
    defaultScope: scopeComplete,
    typesAppend: [
      { name: 'workflow: workflow improvements', value: 'workflow' },
      { name: 'types:   type definition file changes', value: 'types' }
    ]
  },
  rules: {
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 108],
    'scope-enum': [0],
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    'type-enum': [2, 'always', TYPES],
    'function-rules/scope-enum': [
      2,
      'always',
      parsed => {
        if (!parsed.scope || allowedScopes.includes(parsed.scope)) {
          return [true]
        }

        return [false, `scope must be one of: ${allowedScopes.join(', ')}`]
      }
    ]
  }
}

export default userConfig
