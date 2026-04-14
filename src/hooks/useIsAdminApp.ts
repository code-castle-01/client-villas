import { useGetIdentity } from "@refinedev/core";

type UserWithRole = {
  role?: {
    type?: string;
  };
};

export const useIsAdminApp = () => {
  const { data: user } = useGetIdentity<UserWithRole>();
  return user?.role?.type === "admin-app";
};
