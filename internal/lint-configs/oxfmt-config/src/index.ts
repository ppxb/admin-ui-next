import { defineConfig as defineOxfmtConfig } from 'oxfmt'

type OxfmtConfig = Parameters<typeof defineOxfmtConfig>[0]

const oxfmtConfig: OxfmtConfig = defineOxfmtConfig({
  printWidth: 80,
  semi: false,
  proseWrap: 'never',
  singleQuote: true,
  arrowParens: 'avoid',
  trailingComma: 'none'
})

function defineConfig(config: OxfmtConfig = {}): OxfmtConfig {
  return defineOxfmtConfig({
    ...oxfmtConfig,
    ...config
  })
}

export { defineConfig, oxfmtConfig }

export type { OxfmtConfig }
