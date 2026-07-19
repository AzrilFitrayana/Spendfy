import { toast } from "sonner";

export const successToast = (message: string) => {
  toast.success(message, {
    position: "top-right",
    style: { backgroundColor: "#dcfce7", color: "#166534" },
  });
};

export const errorToast = (message: string) => {
  toast.error(message, {
    position: "top-right",
    style: { backgroundColor: "#fee2e2", color: "#991b1b" },
  });
};
