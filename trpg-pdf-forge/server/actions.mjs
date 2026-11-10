/** Single action registry: labels and prompt keys live here only. */
export const ACTIONS = {
  upload: { labelKey: 'actionUpload', prompt: null, tone: 'neutral' },
  start: { labelKey: 'actionStart', prompt: 'start', tone: 'primary' },
  review: { labelKey: 'actionReview', prompt: null, tone: 'primary' },
  revise: { labelKey: 'actionRevise', prompt: 'revise', tone: 'neutral' },
  fix: { labelKey: 'actionFix', prompt: 'fix', tone: 'warn' },
  proof: { labelKey: 'actionProof', prompt: 'proof', tone: 'warn' },
  auto: { labelKey: 'actionAuto', prompt: 'auto', tone: 'primary' },
  build: { labelKey: 'actionBuild', prompt: 'build', tone: 'primary' },
  none: { labelKey: 'actionNone', prompt: null, tone: 'neutral' },
};

export function makeNext(action, detail = '') {
  const resolved = ACTIONS[action] ? action : 'none';
  const entry = ACTIONS[resolved];
  return {
    action: resolved,
    labelKey: entry.labelKey,
    promptKey: entry.prompt,
    tone: entry.tone,
    detail,
  };
}

export function validateActions(promptKeys = []) {
  const errors = [];
  for (const [name, entry] of Object.entries(ACTIONS)) {
    if (!entry.labelKey.startsWith('action')) errors.push(`${name}: labelKey 不是 action*`);
    if (entry.prompt && !promptKeys.includes(entry.prompt)) {
      errors.push(`${name}: prompt ${entry.prompt} 不存在`);
    }
  }
  return errors;
}
