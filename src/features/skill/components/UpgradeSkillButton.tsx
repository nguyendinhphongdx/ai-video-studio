'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api/client';

import { skillApi } from '../services/skill.api';

/** The market has a newer version of this skill: one click replaces the channel's copy (edits included, so it says so). */
export function UpgradeSkillButton({ channelId, skillId, size = 'sm' }: { channelId: string; skillId: string; size?: 'sm' | 'default' }) {
  const qc = useQueryClient();
  const upgrade = useMutation({
    mutationFn: () => skillApi.upgrade(channelId, skillId),
    onSuccess: (d) => {
      void qc.invalidateQueries({ queryKey: ['skills'] });
      void qc.invalidateQueries({ queryKey: ['skill'] });
      void qc.invalidateQueries({ queryKey: ['market'] });
      toast.success(`Đã cập nhật “${d.skill.name}”. Video viết sau đây sẽ dùng các mẫu mới; video đã viết giữ nguyên.`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Button type="button" size={size} variant="outline" disabled={upgrade.isPending} title="Thay bằng bản mới trong kho. Phần bạn đã sửa tay trong skill này sẽ mất." onClick={() => upgrade.mutate()}>
      {upgrade.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
      Cập nhật bản mới
    </Button>
  );
}
