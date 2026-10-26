'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { queryKeys, useCurrentChannel } from '@/features/app';
import { errorMessage } from '@/lib/api/client';
import { useAssistantStore } from '@/stores/assistant-store';

import { ChannelEditor } from '../components/ChannelEditor';
import { useChannel } from '../hooks/use-channels';
import { channelApi, NEW_CHANNEL } from '../services/channel.api';

function NewChannelDialog() {
  const router = useRouter();
  const qc = useQueryClient();
  const { setChannelId } = useCurrentChannel();
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const create = useMutation({
    mutationFn: () => channelApi.create({ ...NEW_CHANNEL, name: name.trim(), description: about.trim() }),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: queryKeys.channels });
      setChannelId(c.id);
      if (about.trim()) useAssistantStore.getState().ask('Mình vừa tạo kênh này. Hãy thiết kế bộ nhận diện riêng cho kênh: mở đầu, kết, bảng màu, font, câu chào cuối và phong cách ảnh phù hợp với mô tả của kênh.');
      router.push(`${ROUTES.channels}/${c.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          Kênh mới
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo kênh mới</DialogTitle>
          <DialogDescription>Đặt tên và mô tả ngắn; trợ lý sẽ thiết kế mở đầu, kết, màu và font cho kênh, bạn chỉnh lại bằng cách nói chuyện với trợ lý.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <Label htmlFor="new-ch">Tên kênh</Label>
          <Input id="new-ch" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Mẹo vặt nấu ăn" maxLength={60} />
          <Label htmlFor="new-about" className="mt-3">
            Kênh nói về gì? (không bắt buộc)
          </Label>
          <Textarea id="new-about" rows={3} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={500} placeholder="VD: Giải thích các sự kiện lịch sử, kinh tế bằng đồ hoạ cho người trẻ. Có mô tả, trợ lý sẽ tự thiết kế mở đầu, màu và font cho bạn." />
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Tạo kênh
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChannelListView() {
  const { channels, current, setChannelId, isLoading } = useCurrentChannel();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Kênh & thương hiệu" description="Mỗi kênh có nhận diện, khán giả và giọng văn riêng. AI viết theo kênh; các khối dựng dùng logo, màu và font của kênh." actions={<NewChannelDialog />} />
      {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((c) => (
          <Link key={c.id} href={`${ROUTES.channels}/${c.id}`} onClick={() => setChannelId(c.id)} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-center gap-3">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt="" className="size-14 rounded-xl object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-xl text-title font-extrabold text-white" style={{ background: c.palette[0] }}>
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-title font-bold">{c.name}</div>
                <div className="truncate text-caption text-muted-foreground">{c.audience}</div>
              </div>
              {current?.id === c.id ? <span className="ml-auto rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-success">Đang dùng</span> : null}
            </div>
            {c.description ? <p className="line-clamp-2 text-small text-slate-700">{c.description}</p> : null}
            <div className="mt-auto flex gap-1.5" aria-label="Bảng màu">
              {c.palette.map((p) => (
                <span key={p} className="size-6 rounded-full border" style={{ background: p }} />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ChannelEditView({ id }: { id: string }) {
  const { data: channel, error } = useChannel(id);
  return (
    <div className="flex flex-col gap-6">
      <Link href={ROUTES.channels} className="flex w-fit items-center gap-1.5 text-small text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Tất cả kênh
      </Link>
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {channel ? (
        <>
          <PageHeader title={channel.name} description="Thông tin kênh và thương hiệu. AI và các khối dựng dùng ngay cài đặt mới cho video tiếp theo." />
          <ChannelEditor key={channel.id} channel={channel} />
        </>
      ) : (
        <Skeleton className="h-96 rounded-2xl" />
      )}
    </div>
  );
}
