interface LinkingStats {
  totalImages: number;
  linkedImages: number;
  unlinkedImages: number;
  withSku: number;
  recentlyLinked: number;
  linkingRate: number;
}

interface LinkingStatsCardProps {
  stats: LinkingStats | null;
}

export const LinkingStatsCard = ({ stats }: LinkingStatsCardProps) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <div className="text-center p-3 bg-muted rounded-lg">
        <div className="text-xl font-bold">{stats.totalImages.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">Total Images</div>
      </div>
      <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
        <div className="text-xl font-bold text-green-600">{stats.linkedImages.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">Linked</div>
      </div>
      <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
        <div className="text-xl font-bold text-orange-600">{stats.unlinkedImages.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">Unlinked</div>
      </div>
      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <div className="text-xl font-bold text-blue-600">{stats.withSku.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">With SKU</div>
      </div>
      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
        <div className="text-xl font-bold text-purple-600">{stats.recentlyLinked.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">Recent (24h)</div>
      </div>
      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
        <div className="text-xl font-bold text-yellow-600">{stats.linkingRate}%</div>
        <div className="text-sm text-muted-foreground">Success Rate</div>
      </div>
    </div>
  );
};

export type { LinkingStats };
