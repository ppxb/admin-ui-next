import type { OxlintConfig } from 'oxlint'

const unicorn: OxlintConfig = {
  rules: {
    'unicorn/no-process-exit': 'error',
    'unicorn/prefer-module': 'error',
    'unicorn/no-invalid-fetch-options': 'error',
    'unicorn/no-invalid-remove-event-listener': 'error',
    'unicorn/no-thenable': 'error',
    'unicorn/no-unnecessary-await': 'error',
    'unicorn/no-useless-fallback-in-spread': 'error',
    'unicorn/prefer-string-starts-ends-with': 'error',
    'unicorn/prefer-set-size': 'warn',
    'unicorn/consistent-function-scoping': 'off',
    'unicorn/no-single-promise-in-promise-methods': 'off',
    'unicorn/no-useless-spread': 'off',
    'unicorn/prefer-global-this': 'off'
  }
}

export { unicorn }
