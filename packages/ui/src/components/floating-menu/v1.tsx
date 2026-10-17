import './v1.css';
import React, { useId, useState } from 'react';
import type { IconButtonProps, MenuProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useDialog } from '../use-dialog.ts';
const IconButton = (props: IconButtonProps) => (
  <library.Slot component="fp.icon-button" {...props} />
);
export const Menu: React.FC<MenuProps> = ({
  open,
  previewTrigger,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  anchor = 'bottom',
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const close = () => {
    setPreviewOpen(false);
    onClose();
  };
  const dialogRef = useDialog(open || previewOpen, true, anchor);
  const titleId = useId();
  return (
    <>
      {previewTrigger && (
        <button className="btn btn-secondary" onClick={() => setPreviewOpen(true)}>
          {previewTrigger}
        </button>
      )}
      <dialog
        data-fp-component="fp.floating-menu"
        data-fp-version="v1"
        ref={dialogRef}
        className={`menu-dialog menu-anchor-${anchor}`}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="menu-popup">
          <header className="menu-header">
            <h2 id={titleId} className="menu-title">
              {title}
            </h2>
            <IconButton icon="close" label={closeLabel} onClick={close} />
          </header>
          <div className="menu-body">{children}</div>
          {footer && <footer className="menu-footer">{footer}</footer>}
        </div>
      </dialog>
    </>
  );
};
export default library.version({
  id: 'fp.floating-menu',
  version: 'v1',
  component: Menu,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Interactive anchored menu',
      props: {
        open: false,
        previewTrigger: 'Open menu',
        onClose: () => {},
        title: 'Recipe actions',
        closeLabel: 'Close',
        children: 'Actions',
      },
    },
  ],
});
