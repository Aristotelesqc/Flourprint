import { Ui } from './library';
import type {
  BottomBarProps,
  IconProps,
  ButtonProps,
  IconButtonProps,
  SurfaceProps,
  BadgeProps,
  NumberFieldProps,
  CheckboxProps,
  TabsProps,
  DisclosureProps,
  ModalProps,
  MenuProps,
} from '../../../../packages/ui/src/props';
export type * from '../../../../packages/ui/src/props';
export const Icon = (props: IconProps) => <Ui component="fp.icon" {...props} />;
export const Button = (props: ButtonProps) => <Ui component="fp.button" {...props} />;
export const IconButton = (props: IconButtonProps) => <Ui component="fp.icon-button" {...props} />;
export const Surface = (props: SurfaceProps) => <Ui component="fp.surface" {...props} />;
export const Badge = (props: BadgeProps) => <Ui component="fp.badge" {...props} />;
export const NumberField = (props: NumberFieldProps) => (
  <Ui component="fp.number-field" {...props} />
);
export const Checkbox = (props: CheckboxProps) => (
  <Ui component="fp.weighing-checkbox" {...props} />
);
export const Tabs = (props: TabsProps) => <Ui component="fp.tabs" {...props} />;
export const Disclosure = (props: DisclosureProps) => <Ui component="fp.group-card" {...props} />;
export const Modal = (props: ModalProps) => <Ui component="fp.bottom-sheet" {...props} />;
export const Menu = (props: MenuProps) => <Ui component="fp.floating-menu" {...props} />;

export const BottomBar = (props: BottomBarProps) => <Ui component="fp.bottom-bar" {...props} />;
