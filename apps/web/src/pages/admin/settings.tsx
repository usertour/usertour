import {
  useAdminSettingsQuery,
  useUpdateInstanceLicenseMutation,
} from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { SettingsContent } from '@/pages/settings/components/content';
import { Button } from '@usertour-packages/button';
import { Badge } from '@usertour-packages/badge';

const LicenseStatusBadge = ({
  isValid,
  isExpired,
}: { isValid: boolean; isExpired?: boolean | null }) => {
  if (!isValid) {
    return <Badge variant="destructive">Invalid</Badge>;
  }
  if (isExpired) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
};

export const AdminSettingsPage = () => {
  const { data, loading, refetch } = useAdminSettingsQuery();
  const { invoke: updateLicense, loading: updating } = useUpdateInstanceLicenseMutation();
  const { toast } = useToast();
  const [licenseInput, setLicenseInput] = useState('');

  const handleUpdateLicense = async () => {
    const trimmed = licenseInput.trim();
    if (!trimmed) {
      toast({ variant: 'destructive', title: 'Please enter a license key' });
      return;
    }
    try {
      await updateLicense(trimmed);
      toast({ title: 'License updated successfully' });
      setLicenseInput('');
      refetch();
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update license' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col grow space-y-8 py-8">
        <SettingsContent className="min-w-[750px] max-w-3xl shadow-sm border border-border rounded mx-auto bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </SettingsContent>
      </div>
    );
  }

  const licenseInfo = data?.licenseInfo;
  const payload = licenseInfo?.payload;

  return (
    <div className="flex flex-col grow space-y-8 py-8">
      {/* Instance Info */}
      <SettingsContent className="min-w-[750px] max-w-3xl shadow-sm border border-border rounded mx-auto bg-background">
        <h3 className="text-lg font-medium">Instance Information</h3>
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Instance ID</span>
            <span className="text-sm font-mono select-all">{data?.instanceId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Projects</span>
            <span className="text-sm">{data?.projectCount}</span>
          </div>
        </div>
      </SettingsContent>

      {/* License Status */}
      <SettingsContent className="min-w-[750px] max-w-3xl shadow-sm border border-border rounded mx-auto bg-background">
        <h3 className="text-lg font-medium">Instance License</h3>
        {licenseInfo ? (
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <LicenseStatusBadge isValid={licenseInfo.isValid} isExpired={licenseInfo.isExpired} />
            </div>
            {licenseInfo.error && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Error</span>
                <span className="text-sm text-destructive">{licenseInfo.error}</span>
              </div>
            )}
            {payload && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scope</span>
                  <span className="text-sm capitalize">{payload.scope || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="text-sm capitalize">{payload.plan || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Project Limit</span>
                  <span className="text-sm">
                    {payload.projectLimit === null || payload.projectLimit === undefined
                      ? 'Unlimited'
                      : payload.projectLimit}
                  </span>
                </div>
                {payload.features && payload.features.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Features</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {payload.features.map((f: string) => (
                        <Badge key={f} variant="outline" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {licenseInfo.daysRemaining !== null && licenseInfo.daysRemaining !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Days Remaining</span>
                    <span className="text-sm">{licenseInfo.daysRemaining}</span>
                  </div>
                )}
                {payload.instanceId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">License Instance ID</span>
                    <span className="text-sm font-mono">{payload.instanceId}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-4">No license configured.</p>
        )}
      </SettingsContent>

      {/* Update License */}
      <SettingsContent className="min-w-[750px] max-w-3xl shadow-sm border border-border rounded mx-auto bg-background">
        <h3 className="text-lg font-medium">Update Instance License</h3>
        <div className="mt-4 space-y-4">
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
            placeholder="Paste your license key here..."
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
          />
          <Button onClick={handleUpdateLicense} disabled={updating}>
            {updating ? 'Updating...' : 'Update License'}
          </Button>
        </div>
      </SettingsContent>
    </div>
  );
};

AdminSettingsPage.displayName = 'AdminSettingsPage';
