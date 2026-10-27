'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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
import { skillApi, skillKeys } from '@/features/skill/services/skill.api';
import { errorMessage } from '@/lib/api/client';
import { useAssistantStore } from '@/stores/assistant-store';

import { ChannelEditor } from '../components/ChannelEditor';
import { useChannel } from '../hooks/use-channels';
import { channelContext, recommendSkills } from '../lib/recommend';
import { channelApi, NEW_CHANNEL, toInput } from '../services/channel.api';

function NewChannelDialog() {
  const router = useRouter();
  const qc = useQueryClient();
  const { setChannelId } = useCurrentChannel();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [picked, setPicked] = useState<string[] | null>(null);
  const market = useQuery({ queryKey: skillKeys.market(), queryFn: () => skillApi.market(), enabled: open && step === 2 });
  // Styles that fit what the channel says about itself, best first. The all-round one every channel gets is not offered again.
  const ranked = useMemo(() => recommendSkills((market.data ?? []).filter((m) => m.id !== 'cinematic'), channelContext({ name, description: about })), [market.data, name, about]);
  const chosen = picked ?? ranked.filter((r) => r.score >= 3).slice(0, 1).map((r) => r.item.id);
  const create = useMutation({
    mutationFn: async () => {
      const channel = await channelApi.create({ ...NEW_CHANNEL, name: name.trim(), description: about.trim() });
      let first: string | null = null;
      for (const id of chosen) {
        const d = await skillApi.install(channel.id, id);
        first ??= d.skill.id;
      }
      // A style picked for this channel is its default; with none picked the built-in all-round one stays.
      return first ? channelApi.update(channel.id, { ...toInput(channel), defaultSkillId: first }) : channel;
    },
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: queryKeys.channels });
      void qc.invalidateQueries({ queryKey: ['skills'] });
      setChannelId(c.id);
      setOpen(false);
      if (about.trim()) useAssistantStore.getState().ask(`Mình vừa tạo kênh này${chosen.length ? ` và đã chọn kiểu video ${chosen.join(', ')}` : ''}. Hãy thiết kế bộ nhận diện riêng cho kênh dựa trên mô tả và khán giả của kênh: mở đầu, kết, bảng màu, font, câu chào cuối và phong cách ảnh. Sau đó gợi ý loại cảnh nên bật cho kiểu video của kênh.`);
      router.push(`${ROUTES.channels}/${c.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = (id: string) => setPicked((p) => ((p ?? chosen).includes(id) ? (p ?? chosen).filter((x) => x !== id) : [...(p ?? chosen), id]));
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setStep(1);
          setPicked(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden />
          Kênh mới
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Tạo kênh mới' : 'Kiểu video hợp với kênh'}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Đặt tên và mô tả ngắn. Mô tả càng rõ, gợi ý kiểu video và thiết kế của trợ lý càng sát kênh.' : 'Gợi ý theo tên và mô tả kênh. Bạn luôn có sẵn kiểu đa năng; chọn thêm nếu muốn, sửa lại sau trong trang kênh.'}
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setStep(2);
            }}
          >
            <Label htmlFor="new-ch">Tên kênh</Label>
            <Input id="new-ch" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Mẹo vặt nấu ăn" maxLength={60} />
            <Label htmlFor="new-about" className="mt-3">
              Kênh nói về gì? (không bắt buộc)
            </Label>
            <Textarea id="new-about" rows={3} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={500} placeholder="VD: Giải thích các sự kiện lịch sử, kinh tế bằng đồ hoạ cho người trẻ. Có mô tả, trợ lý sẽ tự thiết kế mở đầu, màu và font cho bạn." />
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={!name.trim()}>
                Tiếp theo
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto" aria-label="Kiểu video gợi ý">
              {market.isLoading ? <li className="text-small text-muted-foreground">Đang tải kho…</li> : null}
              {ranked.map(({ item, score }) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                    <input type="checkbox" className="mt-1 size-4 accent-primary" checked={chosen.includes(item.id)} onChange={() => toggle(item.id)} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-bold">
                        {item.name}
                        {score >= 3 ? <span className="rounded-full bg-accent px-2 py-0.5 text-caption font-semibold text-accent-foreground">Hợp với kênh</span> : null}
                      </span>
                      <span className="line-clamp-2 text-small text-slate-700">{item.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button type="button" disabled={create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Tạo kênh
              </Button>
            </DialogFooter>
          </div>
        )}
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
