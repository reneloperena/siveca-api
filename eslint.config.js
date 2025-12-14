import vuhioConfig from '@vuhio/eslint-config'

const config = vuhioConfig({
  react: false,
  ignores: [
    '**/*.md',
  ],
  rules: {
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
    'style/member-delimiter-style': ['error', {
      multiline: { delimiter: 'comma', requireLast: true },
      singleline: { delimiter: 'comma', requireLast: false },
    }],
  },
})

export default config
