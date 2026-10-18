import {
  createUi,
  parseUiOverrides,
  defaultMotionManifest,
} from '../../../../packages/ui/src/index';
import { catalogue } from '../../../../packages/ui/src/catalogue/registry';
import { motionCatalogue } from '../../../../packages/ui/src/catalogue/motions';
import { manifest } from './ui.manifest';
// Review-only consumer: selections are ephemeral and never persisted as recipe data.
const overrides = parseUiOverrides(location.search, {
  components: catalogue,
  motions: motionCatalogue,
});
export const motionManifest = { ...defaultMotionManifest, ...overrides.motions };
export const { Ui, versionOf } = createUi(manifest, overrides.components);
