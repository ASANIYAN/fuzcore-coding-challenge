export type AuthUser = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
};

export type AuthUserMessageResponse = {
  success: true;
  data: {
    user: AuthUser;
    message: string;
  };
};

export type AuthMessageResponse = {
  success: true;
  data: {
    message: string;
  };
};
