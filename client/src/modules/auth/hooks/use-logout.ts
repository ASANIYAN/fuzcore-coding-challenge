import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SESSION_STATUS_QUERY_KEY } from "@/modules/auth/hooks/use-session-status";
import { authApi } from "@/services/api-service";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await authApi.post("/auth/logout");
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_STATUS_QUERY_KEY });
      toast.success("You have been logged out.");
      void navigate("/login", { replace: true });
    },
    onError: () => {
      toast.error("Unable to log out right now. Please try again.");
    },
  });

  return {
    logout: mutation.mutate,
    isLoggingOut: mutation.isPending,
  };
}
