import { createUi, parseOverrides } from '../../../../packages/ui/src/index';
import { catalogue } from '../../../../packages/ui/src/catalogue/registry';
import { manifest } from './ui.manifest';
// This is a review-only mockup, never a release consumer. Overrides are ephemeral.
export const { Ui, versionOf } = createUi(
  manifest,
  parseOverrides(location.search, catalogue).overrides,
);
