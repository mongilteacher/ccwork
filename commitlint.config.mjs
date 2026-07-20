export default {
  extends: ['@commitlint/config-conventional'],

  plugins: [
    {
      rules: {
        // 본문(body)의 내용이 있는 줄 수를 검사한다.
        // commitlint 기본 규칙에는 줄 수 제한이 없어서 직접 정의.
        'body-min-lines': (parsed, when = 'always', value = 2) => {
          const lines = (parsed.body || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

          const pass = lines.length >= value;

          return [
            when === 'never' ? !pass : pass,
            `본문은 최소 ${value}줄이어야 합니다 (현재 ${lines.length}줄). ` +
              `제목 아래 빈 줄을 두고 변경 이유와 내용을 적어주세요.`,
          ];
        },
      },
    },
  ],

  rules: {
    // 제목: 필수
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],

    // 본문: 필수 + 최소 2줄, 제목과 본문 사이 빈 줄 필수
    'body-empty': [2, 'never'],
    'body-leading-blank': [2, 'always'],
    'body-min-lines': [2, 'always', 2],

    // 한글 커밋 메시지를 쓰므로 대소문자 규칙은 끈다
    'subject-case': [0],
  },
};
