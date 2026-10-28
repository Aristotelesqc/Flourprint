import type { ButtonProps } from './components/button/props.ts';
import type { SurfaceProps } from './components/surface/props.ts';
import type { NumberFieldProps } from './components/number-field/props.ts';
import type { DisclosureProps } from './components/disclosure/props.ts';
import type { TabsProps } from './components/tabs/props.ts';
import type { FloatingMenuProps } from './components/floating-menu/props.ts';
import type { BottomSheetProps } from './components/bottom-sheet/props.ts';
import type { DialogProps } from './components/dialog/props.ts';
import type { SelectProps } from './components/select/props.ts';

import type { SortableListProps } from './components/sortable-list/props.ts';

/** Display-ready foundation props; screens own i18n, domain state and commands. */
export type FlourprintComponents = {
  readonly 'fp.button': ButtonProps;
  readonly 'fp.surface': SurfaceProps;
  readonly 'fp.number-field': NumberFieldProps;
  readonly 'fp.disclosure': DisclosureProps;
  readonly 'fp.tabs': TabsProps;
  readonly 'fp.floating-menu': FloatingMenuProps;
  readonly 'fp.bottom-sheet': BottomSheetProps;
  readonly 'fp.dialog': DialogProps;
  readonly 'fp.select': SelectProps;
  readonly 'fp.sortable-list': SortableListProps;
};
