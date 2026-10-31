import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

export default function useResource(path, params = {}) {
  const [state, setState] = useState({ items: [], pagination: null, loading: true, error: '' });
  const query = JSON.stringify(params);
  const refresh = useCallback(async () => {
    setState(current => ({ ...current, loading: true, error: '' }));
    try { const result = (await api.get(path, { params: JSON.parse(query) })).data.data; setState({ items: result.items || [], pagination: result.pagination || null, loading: false, error: '' }); }
    catch (error) { setState(current => ({ ...current, loading: false, error: error.message })); }
  }, [path, query]);
  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}
