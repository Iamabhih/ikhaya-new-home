import { AlertTriangle } from "lucide-react";

const AccountSuspended = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Account Suspended</h1>
        <p className="text-muted-foreground">
          This account has been suspended. Please contact support for assistance.
        </p>
      </div>
    </div>
  );
};

export default AccountSuspended;
