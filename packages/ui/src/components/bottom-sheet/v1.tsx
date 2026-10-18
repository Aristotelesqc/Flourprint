import './v1.css';
import React, { useId, useState } from 'react';
import type { IconButtonProps, ModalProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useDialog } from '../use-dialog.ts';
const IconButton = (props: IconButtonProps) => (
  <library.Slot component="fp.icon-button" {...props} />
);
export const Modal: React.FC<ModalProps> = ({
  open,
  previewTrigger,
  onClose,
  title,
  closeLabel,
  children,
  footer,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const close = () => {
    setPreviewOpen(false);
    onClose();
  };
  const dialogRef = useDialog(open || previewOpen, false);
  const titleId = useId();
  return (
    <>
      {previewTrigger && (
        <button className="btn btn-secondary" onClick={() => setPreviewOpen(true)}>
          {previewTrigger}
        </button>
      )}
      <dialog
        data-fp-component="fp.bottom-sheet"
        data-fp-version="v1"
        ref={dialogRef}
        className={`modal-dialog`}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="sheet-backdrop" aria-hidden="true" />
        <div className="modal-sheet">
          <div className="sheet-handle" aria-hidden="true" />
          <header className="modal-header">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            <IconButton icon="close" label={closeLabel} onClick={close} />
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </div>
      </dialog>
    </>
  );
};
export default library.version({
  id: 'fp.bottom-sheet',
  version: 'v1',
  component: Modal,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Interactive sheet',
      props: {
        open: false,
        previewTrigger: 'Open sheet',
        onClose: () => {},
        title: 'Details',
        closeLabel: 'Close',
        children: 'Body',
      },
    },
  ],
});
