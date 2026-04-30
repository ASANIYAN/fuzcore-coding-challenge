import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomButton } from "@/components/custom/custom-button";

type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export default function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onOpenChange,
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <CustomButton
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </CustomButton>
          <CustomButton type="button" variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
