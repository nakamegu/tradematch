import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useDeleteAccount() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteAllData = async () => {
    setDeleting(true);
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        await supabase.from('user_goods').delete().eq('user_id', userId);
        await supabase.from('matches').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
        await supabase.from('users').delete().eq('id', userId);
      }
      localStorage.removeItem('userId');
      localStorage.removeItem('nickname');
      localStorage.removeItem('tradeGroups');
      localStorage.removeItem('currentMatch');
      localStorage.removeItem('selectedEventId');
      router.push('/');
    } catch (err) {
      console.error('Delete error:', err);
      setDeleting(false);
    }
  };

  return { showDeleteConfirm, setShowDeleteConfirm, deleting, handleDeleteAllData };
}
