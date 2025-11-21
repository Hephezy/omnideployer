export type DeploymentStep =
  | "idle"
  | "preparing"
  | "estimating"
  | "signing"
  | "broadcasting"
  | "confirming"
  | "success"
  | "error";
