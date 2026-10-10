import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { tapLight } from '@/lib/haptics';
import { c } from '@/theme';

/** Pull-to-refresh for a screen's ScrollView: pass the data hook's `reload`. */
export function usePullRefresh(reload: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    tapLight();
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.navy} colors={[c.navy]} />;
}
