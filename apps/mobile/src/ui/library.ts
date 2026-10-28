import { createLibrary, createUi, type FlourprintComponents } from '@flourprint/ui';
import button from '@flourprint/ui/components/button/v1';
import surface from '@flourprint/ui/components/surface/v1';
import numberField from '@flourprint/ui/components/number-field/v1';
import disclosure from '@flourprint/ui/components/disclosure/v1';
import tabs from '@flourprint/ui/components/tabs/v1';
import floatingMenu from '@flourprint/ui/components/floating-menu/v1';
import bottomSheet from '@flourprint/ui/components/bottom-sheet/v1';
import dialog from '@flourprint/ui/components/dialog/v1';
import select from '@flourprint/ui/components/select/v1';
import bottomBar from '@flourprint/ui/components/bottom-bar/v1';

const library = createLibrary<FlourprintComponents>();

export const { Ui, versionOf } = createUi(
  library.manifest({
    'fp.button': button,
    'fp.surface': surface,
    'fp.number-field': numberField,
    'fp.disclosure': disclosure,
    'fp.tabs': tabs,
    'fp.floating-menu': floatingMenu,
    'fp.bottom-sheet': bottomSheet,
    'fp.dialog': dialog,
    'fp.select': select,
    'fp.bottom-bar': bottomBar,
  }),
);
