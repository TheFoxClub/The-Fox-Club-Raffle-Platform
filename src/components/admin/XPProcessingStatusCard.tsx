import { Activity, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface ProcessingStatus {
  pendingTransactions: number;
  pendingRaffles: number;
  totalXpRecords: number;
  totalXpAwarded: number;
}

interface XPProcessingStatusCardProps {
  status: ProcessingStatus | null;
}

export function XPProcessingStatusCard({ status }: XPProcessingStatusCardProps) {
  if (!status) {
    return (
      <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Processing Status</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No processing status available</p>
        </div>
      </div>
    );
  }

  const hasPendingWork = status.pendingTransactions > 0 || status.pendingRaffles > 0;

  return (
    <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Processing Status</h3>
      </div>

      <div className="space-y-4">
        {/* Overall Status */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
          hasPendingWork 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          {hasPendingWork ? (
            <Clock className="h-5 w-5" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          <div>
            <p className="text-sm font-medium">
              {hasPendingWork ? 'Processing Pending Items' : 'All Caught Up'}
            </p>
            <p className="text-xs opacity-75">
              {hasPendingWork 
                ? 'XP awards are being processed in the background'
                : 'No pending XP awards to process'
              }
            </p>
          </div>
        </div>

        {/* Processing Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Pending Transactions</span>
              </div>
              <span className={`text-sm font-bold ${
                status.pendingTransactions > 0 ? 'text-orange-500' : 'text-muted-foreground'
              }`}>
                {status.pendingTransactions}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Pending Raffles</span>
              </div>
              <span className={`text-sm font-bold ${
                status.pendingRaffles > 0 ? 'text-blue-500' : 'text-muted-foreground'
              }`}>
                {status.pendingRaffles}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Total Records</span>
              </div>
              <span className="text-sm font-bold text-green-500">
                {status.totalXpRecords.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total XP Awarded</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {status.totalXpAwarded.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Processing Info */}
        <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">How XP Processing Works:</p>
              <ul className="space-y-1 text-xs opacity-90">
                <li>• XP is awarded automatically when transactions are confirmed</li>
                <li>• Processing runs every minute to catch new transactions</li>
                <li>• Revenue XP is awarded when raffles end</li>
                <li>• Creation XP is awarded when raffles are successfully created</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}